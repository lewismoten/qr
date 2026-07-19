import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { tippecanoeArguments } from '../../scripts/maps/vector/command.mjs';
import {
  prepareVectorFeature,
  validateVectorLayers,
} from '../../scripts/maps/vector/prepare.mjs';
import { publishDetailedMap } from '../../scripts/maps/vector/publish.mjs';

test('normalizes map properties and feature zoom hints', () => {
  const feature = prepareVectorFeature('towns', {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [1, 2] },
    properties: {
      name: 'Example',
      population: 1200,
      min_zoom: 8.2,
      ignored: 'large unused value',
    },
  });
  assert.deepEqual(feature.properties, {
    class: 'town',
    name: 'Example',
    population: 1200,
  });
  assert.deepEqual(feature.tippecanoe, { minzoom: 9, maxzoom: 11 });
  assert.equal(feature.properties.ignored, undefined);
  assert.equal(prepareVectorFeature('missing', feature), null);
  validateVectorLayers();
});

test('applies source filters before writing vector features', () => {
  const excluded = prepareVectorFeature('naturalEarthRoads', {
    type: 'Feature',
    geometry: { type: 'LineString', coordinates: [] },
    properties: { sov_a3: 'USA' },
  });
  assert.equal(excluded, null);
});

test('builds a PMTiles Tippecanoe command with a 16 KiB limit', () => {
  const args = tippecanoeArguments({
    inputs: [{ layer: 'land', file: 'land.geojsonseq' }],
    output: 'local.pmtiles',
  });
  assert.ok(args.includes('--maximum-tile-bytes=16384'));
  assert.ok(args.includes('--full-detail=11'));
  assert.ok(args.includes('--low-detail=9'));
  assert.ok(args.includes('--drop-densest-as-needed'));
  assert.ok(args.includes('--detect-shared-borders'));
  assert.ok(args.some((value) => value.startsWith('--named-layer=land:')));
  assert.ok(args.some((value) => value.endsWith('local.pmtiles')));
});

test('publishes the PMTiles archive into a new map directory', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'qr-map-publish-'));
  const archive = path.join(root, 'source', 'local.pmtiles');
  const outputRoot = path.join(root, 'site');
  try {
    await mkdir(path.dirname(archive), { recursive: true });
    await writeFile(archive, 'PMTiles');
    assert.equal(
      await publishDetailedMap({ outputRoot, archive, legacyTiles: '' }),
      'pmtiles',
    );
    assert.equal(
      await readFile(path.join(outputRoot, 'maps', 'local.pmtiles'), 'utf8'),
      'PMTiles',
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
