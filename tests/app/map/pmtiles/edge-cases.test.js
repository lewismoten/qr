import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createPmtilesArchiveSet } from '../../../../src/js/app/ui/content/geo/pmtiles/archive-set.js';
import { decompressPmtiles } from '../../../../src/js/app/ui/content/geo/pmtiles/compression.js';
import {
  decodeDirectory,
  findDirectoryEntry,
} from '../../../../src/js/app/ui/content/geo/pmtiles/directory.js';
import {
  HEADER_BYTES,
  INITIAL_RANGE_BYTES,
  parsePmtilesHeader,
} from '../../../../src/js/app/ui/content/geo/pmtiles/header.js';
import { createPmtilesSource } from '../../../../src/js/app/ui/content/geo/pmtiles/source.js';

const encoder = new TextEncoder();

function varint(value) {
  const bytes = [];
  let remaining = value;
  do {
    let byte = remaining % 128;
    remaining = Math.floor(remaining / 128);
    if (remaining) byte |= 0x80;
    bytes.push(byte);
  } while (remaining);
  return bytes;
}

function archiveHeader({
  rootOffset = HEADER_BYTES,
  rootLength = 5,
  leafOffset = 200,
  leafLength = 5,
  tileOffset = 256,
  tileType = 1,
} = {}) {
  const bytes = new Uint8Array(259);
  bytes.set(encoder.encode('PMTiles'));
  const view = new DataView(bytes.buffer);
  view.setUint8(7, 3);
  view.setBigUint64(8, BigInt(rootOffset), true);
  view.setBigUint64(16, BigInt(rootLength), true);
  view.setBigUint64(40, BigInt(leafOffset), true);
  view.setBigUint64(48, BigInt(leafLength), true);
  view.setBigUint64(56, BigInt(tileOffset), true);
  view.setBigUint64(64, 3n, true);
  view.setBigUint64(72, 1n, true);
  view.setBigUint64(80, 1n, true);
  view.setBigUint64(88, 1n, true);
  view.setUint8(96, 1);
  view.setUint8(97, 1);
  view.setUint8(98, 1);
  view.setUint8(99, tileType);
  view.setUint8(100, 0);
  view.setUint8(101, 1);
  return bytes;
}

test('rejects invalid PMTiles header identity and ranges', () => {
  const wrongMagic = archiveHeader();
  wrongMagic[0] = 0;
  assert.throws(() => parsePmtilesHeader(wrongMagic), /not a PMTiles/);

  const wrongTileType = archiveHeader({ tileType: 2 });
  assert.throws(() => parsePmtilesHeader(wrongTileType), /MVT vector/);

  const largeRoot = archiveHeader({
    rootOffset: INITIAL_RANGE_BYTES - 2,
    rootLength: 5,
  });
  assert.throws(() => parsePmtilesHeader(largeRoot), /first 16 KiB/);

  const unsafeOffset = archiveHeader();
  new DataView(unsafeOffset.buffer).setBigUint64(
    8,
    BigInt(Number.MAX_SAFE_INTEGER) + 1n,
    true,
  );
  assert.throws(() => parsePmtilesHeader(unsafeOffset), /integer range/);
});

test('covers empty, oversized, and boundary directory entries', () => {
  assert.throws(() => decodeDirectory(new Uint8Array([0])), /empty/);
  assert.throws(
    () => decodeDirectory(new Uint8Array(varint(1_000_001))),
    /entry count/,
  );
  assert.deepEqual(decodeDirectory(new Uint8Array([1, 0, 0, 1, 0])), [
    { tileId: 0, runLength: 0, length: 1, offset: -1 },
  ]);
  const entries = [
    { tileId: 2, runLength: 0 },
    { tileId: 4, runLength: 1 },
  ];
  assert.equal(findDirectoryEntry([], 0), null);
  assert.equal(findDirectoryEntry(entries, 1), null);
  assert.equal(findDirectoryEntry(entries, 2), entries[0]);
  assert.equal(findDirectoryEntry(entries, 5), null);
});

test('reports unavailable browser gzip decompression', async () => {
  const original = globalThis.DecompressionStream;
  try {
    globalThis.DecompressionStream = undefined;
    await assert.rejects(
      () => decompressPmtiles(new Uint8Array([1]), 2),
      /cannot decompress/,
    );
  } finally {
    globalThis.DecompressionStream = original;
  }
});

test('caches leaf directories and sends the archive entity tag', async () => {
  const archive = archiveHeader();
  archive.set([1, 0, 0, 5, 1], HEADER_BYTES);
  archive.set([1, 0, 1, 3, 1], 200);
  archive.set([9, 8, 7], 256);
  const requests = [];
  const fetcher = async (_url, { headers }) => {
    requests.push(headers);
    const [, startText, endText] = /bytes=(\d+)-(\d+)/.exec(headers.Range);
    const start = Number(startText);
    const end = Math.min(Number(endText), archive.length - 1);
    return new Response(archive.slice(start, end + 1), {
      status: 206,
      headers: { ETag: 'map-version' },
    });
  };
  const source = createPmtilesSource('/map.pmtiles', { fetcher });
  assert.deepEqual(await source.getTile(0, 0, 0), new Uint8Array([9, 8, 7]));
  assert.deepEqual(await source.getTile(0, 0, 0), new Uint8Array([9, 8, 7]));
  assert.equal(await source.getTile(1, 0, 0), null);
  assert.equal(
    requests.filter(({ Range }) => Range === 'bytes=200-204').length,
    1,
  );
  assert.equal(requests[1]['If-Match'], 'map-version');
});

test('handles full responses and rejects failed range requests', async () => {
  const archive = archiveHeader();
  archive.set([1, 0, 1, 3, 1], HEADER_BYTES);
  archive.set([9, 8, 7], 256);
  const fullResponse = async () =>
    new Response(archive, {
      status: 200,
      headers: { 'Content-Length': String(archive.length) },
    });
  const source = createPmtilesSource('/map.pmtiles', {
    fetcher: fullResponse,
  });
  assert.equal((await source.getHeader()).maximumZoom, 1);

  const failed = createPmtilesSource('/map.pmtiles', {
    fetcher: async () => new Response(null, { status: 404 }),
  });
  await assert.rejects(() => failed.getHeader(), /404/);
});

test('validates archive-set manifests and absent tile coverage', async () => {
  for (const manifest of [{}, { version: 1, archives: [] }]) {
    await assert.rejects(
      () =>
        createPmtilesArchiveSet('/maps/local.json', {
          fetcher: async () => Response.json(manifest),
        }),
      /manifest/,
    );
  }
  await assert.rejects(
    () =>
      createPmtilesArchiveSet('/maps/local.json', {
        fetcher: async () => new Response(null, { status: 503 }),
      }),
    /503/,
  );
  const source = await createPmtilesArchiveSet('/maps/local.json', {
    fetcher: async () =>
      Response.json({
        version: 1,
        minimumZoom: 2,
        maximumZoom: 2,
        archives: [
          {
            file: 'z02.pmtiles',
            minimumZoom: 2,
            maximumZoom: 2,
          },
        ],
      }),
    sourceFactory: () => ({ getTile: async () => new Uint8Array([2]) }),
  });
  assert.equal(await source.getTile(3, 0, 0), null);
});
