import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { tippecanoeArguments } from '../../scripts/maps/vector/command.mjs';
import {
  temporaryArchivePath,
  validatePmtilesArchive,
} from '../../scripts/maps/vector/output.mjs';
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
  assert.deepEqual(feature.tippecanoe, { minzoom: 9, maxzoom: 13 });
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

test('omits unused labels from non-place vector layers', () => {
  const road = prepareVectorFeature('primaryRoads', {
    type: 'Feature',
    geometry: { type: 'LineString', coordinates: [] },
    properties: { NAME: 'Example Road', NAME_ES: 'Carretera de ejemplo' },
  });
  assert.deepEqual(road.properties, { class: 'primary' });
});

test('classifies ranked USGS flowlines as major waterways', () => {
  const river = prepareVectorFeature('nhdMajorRivers', {
    type: 'Feature',
    geometry: { type: 'LineString', coordinates: [] },
    properties: {
      gnis_name: 'North Fork Shenandoah River',
      streamorde: 6,
      visibilityfilter: 5000000,
      ftype: 558,
    },
  });
  assert.deepEqual(river.properties, { class: 'major' });
  assert.deepEqual(river.tippecanoe, { minzoom: 9, maxzoom: 13 });
});

test('classifies Natural Earth rivers as reference waterways', () => {
  const river = prepareVectorFeature('riversNorthAmerica', {
    type: 'Feature',
    geometry: { type: 'LineString', coordinates: [] },
    properties: { name: 'South Fork Shenandoah River' },
  });
  assert.deepEqual(river.properties, { class: 'reference' });
});

test('classifies detailed Census roads as secondary roads', () => {
  const road = prepareVectorFeature('secondaryRoadsDetailed', {
    type: 'Feature',
    geometry: { type: 'LineString', coordinates: [] },
    properties: { RTTYP: 'S' },
  });
  assert.deepEqual(road.properties, { class: 'secondary' });
  assert.deepEqual(road.tippecanoe, { minzoom: 12, maxzoom: 13 });
});

test('builds a PMTiles Tippecanoe command with a 16 KiB limit', () => {
  const args = tippecanoeArguments({
    inputs: [{ layer: 'land', file: 'land.geojsonseq' }],
    output: 'local.pmtiles',
  });
  assert.ok(args.includes('--maximum-tile-bytes=16384'));
  assert.ok(args.includes('--maximum-zoom=13'));
  assert.ok(args.includes('--base-zoom=12'));
  assert.ok(args.includes('--full-detail=11'));
  assert.ok(args.includes('--low-detail=9'));
  assert.ok(args.includes('--generate-variable-depth-tile-pyramid'));
  assert.ok(args.includes('--drop-densest-as-needed'));
  assert.ok(args.includes('--detect-shared-borders'));
  assert.ok(
    args.some((value) => value.includes('U.S. Geological Survey NHDPlus HR')),
  );
  assert.ok(args.some((value) => value.startsWith('--named-layer=land:')));
  assert.ok(args.some((value) => value.endsWith('local.pmtiles')));
});

test('preserves PMTiles through temporary output validation', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'qr-map-output-'));
  const archive = path.join(root, 'local.partial.pmtiles');
  try {
    const bytes = Buffer.from('PMTiles\x03payload');
    await writeFile(archive, bytes);
    assert.equal(
      temporaryArchivePath(path.join(root, 'local.pmtiles')),
      archive,
    );
    assert.equal(await validatePmtilesArchive(archive, 1024), bytes.length);
    await assert.rejects(() => validatePmtilesArchive(archive, 4), /budget is/);
    await writeFile(archive, 'SQLite format 3');
    await assert.rejects(
      () => validatePmtilesArchive(archive, 1024),
      /PMTiles v3/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
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
