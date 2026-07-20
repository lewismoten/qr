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
import {
  findPmtilesTile,
  getPmtilesStatusZoom,
} from '../../../src/js/app/ui/content/geo/pmtiles/tile.js';
import { zxyToTileId } from '../../../src/js/app/ui/content/geo/pmtiles/tile-id.js';
import { decodeMvt } from '../../../src/js/app/ui/content/geo/mvt/decode.js';
import { decodeGeometry } from '../../../src/js/app/ui/content/geo/mvt/geometry.js';
import {
  getLabelPlacement,
  getMvtTransform,
  getPlaceLimit,
  renderMvt,
  sortPlaces,
} from '../../../src/js/app/ui/content/geo/mvt/render.js';

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

test('finds the nearest PMTiles parent in a variable-depth pyramid', async () => {
  const requests = [];
  const source = {
    async getTile(zoom, x, y) {
      requests.push(`${zoom}/${x}/${y}`);
      return zoom === 10 ? new Uint8Array([10]) : null;
    },
  };
  const result = await findPmtilesTile({
    source,
    tile: { zoom: 13, x: 2316, y: 3133 },
    maximumSourceZoom: 13,
    minimumSourceZoom: 1,
  });
  assert.deepEqual(requests, [
    '13/2316/3133',
    '12/1158/1566',
    '11/579/783',
    '10/289/391',
  ]);
  assert.deepEqual(result.bytes, new Uint8Array([10]));
  assert.deepEqual(result.sourceTile, {
    zoom: 10,
    x: 289,
    y: 391,
    scale: 8,
    offsetX: 4,
    offsetY: 5,
  });
});

test('treats variable-depth parents as covered map levels', () => {
  const parent = { zoom: 12 };
  assert.equal(getPmtilesStatusZoom(13, 13, parent), 13);
  assert.equal(getPmtilesStatusZoom(14, 13, parent), 12);
  assert.equal(getPmtilesStatusZoom(13, 13, null), -1);
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

test('renders sparse MVT tiles without requiring every map layer', () => {
  let cleared = false;
  const context = {
    clearRect() {
      cleared = true;
    },
  };
  const canvas = {
    getContext: () => context,
    height: 256,
    width: 256,
  };
  assert.deepEqual(renderMvt(new Uint8Array(), canvas), []);
  assert.equal(cleared, true);
  cleared = false;
  assert.deepEqual(renderMvt(new Uint8Array(), canvas, { clear: false }), []);
  assert.equal(cleared, false);
});

test('keeps map labels inside their owning vector tile', () => {
  assert.deepEqual(getLabelPlacement(20, 20, 40, 256), {
    box: { left: 22, right: 66, top: 14, bottom: 26 },
    textAlign: 'left',
    textX: 24,
  });
  assert.deepEqual(getLabelPlacement(240, 20, 40, 256), {
    box: { left: 194, right: 238, top: 14, bottom: 26 },
    textAlign: 'right',
    textX: 236,
  });
  assert.equal(getLabelPlacement(-1, 20, 40, 256), null);
  assert.equal(getLabelPlacement(20, 3, 40, 256), null);
});

test('projects parent vectors directly into an overzoomed child', () => {
  assert.deepEqual(
    getMvtTransform(256, 4096, {
      scale: 8,
      offsetX: 4,
      offsetY: 5,
    }),
    { scale: 0.5, offsetX: 1024, offsetY: 1280 },
  );
});

test('limits dense places by zoom and orders them by population', () => {
  const places = [
    { properties: { name: 'Town', population: 500, rank: 1 } },
    { properties: { name: 'City', population: 50_000, rank: 4 } },
    { properties: { name: 'Village', rank: 2 } },
  ];
  assert.deepEqual(
    sortPlaces(places).map((place) => place.properties.name),
    ['City', 'Town', 'Village'],
  );
  assert.equal(getPlaceLimit(8), 6);
  assert.equal(getPlaceLimit(9), 8);
  assert.equal(getPlaceLimit(10), 14);
  assert.equal(getPlaceLimit(11), 24);
  assert.equal(getPlaceLimit(12), 32);
});
