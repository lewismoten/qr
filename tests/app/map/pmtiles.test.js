import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import { test } from 'node:test';

import { decompressPmtiles } from '../../../src/js/app/ui/content/geo/pmtiles/compression.js';
import {
  decodeDirectory,
  findDirectoryEntry,
} from '../../../src/js/app/ui/content/geo/pmtiles/directory.js';
import {
  INITIAL_RANGE_BYTES,
  parsePmtilesHeader,
} from '../../../src/js/app/ui/content/geo/pmtiles/header.js';
import { createPmtilesSource } from '../../../src/js/app/ui/content/geo/pmtiles/source.js';
import { zxyToTileId } from '../../../src/js/app/ui/content/geo/pmtiles/tile-id.js';
import { decodeMvt } from '../../../src/js/app/ui/content/geo/mvt/decode.js';
import { decodeGeometry } from '../../../src/js/app/ui/content/geo/mvt/geometry.js';

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

const field = (number, wire, value) => [...varint(number * 8 + wire), ...value];
const bytesField = (number, value) =>
  field(number, 2, [...varint(value.length), ...value]);
const stringField = (number, value) =>
  bytesField(number, [...new TextEncoder().encode(value)]);

function pointMvt() {
  const value = stringField(1, 'Front Royal');
  const feature = [
    ...bytesField(2, [0, 0]),
    ...field(3, 0, [1]),
    ...bytesField(4, [9, 20, 30]),
  ];
  const layer = [
    ...stringField(1, 'place'),
    ...bytesField(2, feature),
    ...stringField(3, 'name'),
    ...bytesField(4, value),
    ...field(5, 0, varint(4096)),
    ...field(15, 0, [2]),
  ];
  return new Uint8Array(bytesField(3, layer));
}

function header({ rootLength = 5, tileOffset = 256 } = {}) {
  const bytes = new Uint8Array(INITIAL_RANGE_BYTES + 3);
  bytes.set(new TextEncoder().encode('PMTiles'));
  const view = new DataView(bytes.buffer);
  view.setUint8(7, 3);
  view.setBigUint64(8, 127n, true);
  view.setBigUint64(16, BigInt(rootLength), true);
  view.setBigUint64(56, BigInt(tileOffset), true);
  view.setBigUint64(64, 3n, true);
  view.setBigUint64(72, 1n, true);
  view.setBigUint64(80, 1n, true);
  view.setBigUint64(88, 1n, true);
  view.setUint8(96, 1);
  view.setUint8(97, 1);
  view.setUint8(98, 1);
  view.setUint8(99, 1);
  view.setUint8(100, 0);
  view.setUint8(101, 0);
  bytes.set([1, 0, 1, 3, 1], 127);
  bytes.set([9, 8, 7], tileOffset);
  return bytes;
}

test('parses and validates a PMTiles v3 MVT header', () => {
  const parsed = parsePmtilesHeader(header());
  assert.equal(parsed.rootOffset, 127);
  assert.equal(parsed.tileOffset, 256);
  assert.equal(parsed.tileType, 1);

  const invalid = header();
  invalid[7] = 2;
  assert.throws(() => parsePmtilesHeader(invalid), /version 3/);
  assert.throws(() => parsePmtilesHeader(new Uint8Array(10)), /incomplete/);
});

test('decodes PMTiles directories and finds tile and leaf entries', () => {
  const entries = decodeDirectory(new Uint8Array([2, 5, 2, 1, 0, 3, 4, 11, 0]));
  assert.deepEqual(entries, [
    { tileId: 5, runLength: 1, length: 3, offset: 10 },
    { tileId: 7, runLength: 0, length: 4, offset: 13 },
  ]);
  assert.equal(findDirectoryEntry(entries, 5), entries[0]);
  assert.equal(findDirectoryEntry(entries, 6), null);
  assert.equal(findDirectoryEntry(entries, 8), entries[1]);
  assert.throws(
    () => decodeDirectory(new Uint8Array([1, 0, 0, 0, 128])),
    /varint/,
  );
  assert.throws(() => decodeDirectory(new Uint8Array([10, 0])), /entry count/);
});

test('converts ZXY coordinates to cumulative Hilbert tile IDs', () => {
  assert.equal(zxyToTileId(0, 0, 0), 0);
  assert.equal(zxyToTileId(1, 0, 0), 1);
  assert.equal(zxyToTileId(1, 0, 1), 2);
  assert.equal(zxyToTileId(1, 1, 1), 3);
  assert.equal(zxyToTileId(1, 1, 0), 4);
  assert.throws(() => zxyToTileId(1, 2, 0), RangeError);
});

test('reads only the PMTiles ranges needed for a tile', async () => {
  const archive = header();
  const requests = [];
  const fetcher = async (_url, options) => {
    const range = options.headers.Range;
    requests.push(range);
    const [, startText, endText] = /bytes=(\d+)-(\d+)/.exec(range);
    const start = Number(startText);
    const end = Math.min(Number(endText), archive.length - 1);
    return new Response(archive.slice(start, end + 1), {
      status: 206,
      headers: { ETag: 'map-1' },
    });
  };
  const source = createPmtilesSource('/maps/local.pmtiles', { fetcher });
  assert.equal((await source.getHeader()).maximumZoom, 0);
  assert.deepEqual(await source.getTile(0, 0, 0), new Uint8Array([9, 8, 7]));
  assert.deepEqual(requests, ['bytes=0-16383', 'bytes=256-258']);
});

test('rejects servers that ignore PMTiles range requests', async () => {
  const fetcher = async () =>
    new Response(new Uint8Array(20_000), {
      status: 200,
      headers: { 'Content-Length': '20000' },
    });
  const source = createPmtilesSource('/maps/local.pmtiles', { fetcher });
  await assert.rejects(() => source.getHeader(), /byte ranges/);
});

test('decompresses gzip and rejects unsupported compression', async () => {
  const compressed = gzipSync(Buffer.from('vector tile'));
  const bytes = await decompressPmtiles(compressed, 2);
  assert.equal(new TextDecoder().decode(bytes), 'vector tile');
  assert.equal(await decompressPmtiles(bytes, 1), bytes);
  await assert.rejects(() => decompressPmtiles(bytes, 4), /Unsupported/);
});

test('decodes MVT layers, properties, and geometry commands', () => {
  const [layer] = decodeMvt(pointMvt());
  assert.equal(layer.name, 'place');
  assert.equal(layer.extent, 4096);
  assert.equal(layer.version, 2);
  assert.equal(layer.features[0].properties.name, 'Front Royal');
  assert.deepEqual(layer.features[0].geometry, [
    { points: [{ x: 10, y: 15 }], closed: false },
  ]);
  assert.deepEqual(decodeGeometry([9, 2, 2, 10, 4, 0, 15]), [
    {
      points: [
        { x: 1, y: 1 },
        { x: 3, y: 1 },
      ],
      closed: true,
    },
  ]);
});
