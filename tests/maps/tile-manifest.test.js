import assert from 'node:assert/strict';
import test from 'node:test';

import { MAP_SOURCES } from '../../scripts/maps/source-config.mjs';
import { createTileManifest } from '../../scripts/maps/tile-manifest.mjs';

const level = (tiles, bytes, simplified = 0) => ({
  tiles,
  bytes,
  simplified,
});

test('merges an extended tile level into its existing manifest', () => {
  const manifest = createTileManifest({
    previous: {
      zoom: { minimum: 1, maximum: 8 },
      candidates: 80,
      bytesBeforeSimplification: 120,
      levels: { 8: level(10, 100, 1) },
      tileAvailability: { 8: { 1: [2, 2] } },
      tileBundles: { levels: { 8: 4 } },
    },
    current: {
      zoom: { minimum: 9, maximum: 9 },
      candidates: 40,
      bytesBeforeSimplification: 60,
    },
    levels: { 9: level(20, 200, 2) },
    availability: { 9: { 2: [4, 5] } },
    bundleLevels: { 9: 4 },
  });

  assert.deepEqual(manifest.zoom, { minimum: 1, maximum: 9 });
  assert.equal(manifest.candidates, 120);
  assert.equal(manifest.tiles, 30);
  assert.equal(manifest.bytes, 300);
  assert.equal(manifest.bytesBeforeSimplification, 180);
  assert.equal(manifest.simplified, 3);
  assert.deepEqual(manifest.tileBundles.levels, { 8: 4, 9: 4 });
});

test('creates a standalone manifest and configures ranked settlements', () => {
  const manifest = createTileManifest({
    current: {
      zoom: { minimum: 9, maximum: 9 },
      candidates: 4,
      bytesBeforeSimplification: 10,
    },
    levels: { 9: level(2, 20) },
    availability: { 9: {} },
    bundleLevels: { 9: 4 },
  });

  assert.deepEqual(manifest.zoom, { minimum: 9, maximum: 9 });
  assert.equal(manifest.tiles, 2);
  assert.match(MAP_SOURCES.settlements.file, /10m_populated_places/);
  assert.equal(MAP_SOURCES.settlements.minimumZoom, 7);
  assert.equal(MAP_SOURCES.settlements.maximumZoom, 16);
  assert.match(MAP_SOURCES.towns.url, /geonames.*cities1000\.zip/i);
  assert.equal(MAP_SOURCES.towns.minimumZoom, 7);
  assert.equal(MAP_SOURCES.towns.maximumZoom, 16);
});
