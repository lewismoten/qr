import assert from 'node:assert/strict';
import test from 'node:test';

import { MAP_SOURCES } from '../../scripts/maps/source-config.mjs';
import {
  prepareCollections,
  renderTile,
} from '../../scripts/maps/rendering/tile-renderer.mjs';

test('keeps regional river supplements through zoom level sixteen', () => {
  const names = ['riversNorthAmerica', 'riversEurope', 'riversAustralia'];
  for (const name of names) {
    assert.equal(MAP_SOURCES[name].minimumZoom, 8);
    assert.equal(MAP_SOURCES[name].maximumZoom, 16);
  }
});

test('adds ranked public-domain USGS rivers at detailed zooms', () => {
  const source = MAP_SOURCES.nhdMajorRivers;
  assert.equal(source.minimumZoom, 9);
  assert.equal(source.maximumZoom, 16);
  assert.equal(source.maximumFeatures, 2000000);
  assert.equal(source.pageSize, 2000);
  assert.equal(source.objectIdPagination, true);
  assert.equal(source.parallelPages, 4);
  assert.match(source.idsUrl, /returnIdsOnly=true/);
  assert.match(source.url, /NHDPlus_HR\/MapServer\/3\/query/);
  assert.match(source.url, /visibilityfilter%3E%3D5000000/);
  assert.match(source.url, /maxAllowableOffset=0\.00025/);
});

test('uses a finer ranked USGS river tier at zoom fourteen', () => {
  const source = MAP_SOURCES.nhdLocalRivers;
  assert.equal(source.minimumZoom, 14);
  assert.equal(source.maximumZoom, 16);
  assert.equal(source.maximumFeatures, 100000);
  assert.equal(source.objectIdPagination, true);
  assert.match(source.url, /visibilityfilter%3C5000000/);
  assert.match(source.url, /streamorde%3E%3D6/);
  assert.match(source.url, /maxAllowableOffset=0\.0001/);
});

const line = (minimumZoom) => ({
  properties: { min_zoom: minimumZoom },
  geometry: {
    type: 'LineString',
    coordinates: [
      [-1, 0],
      [1, 0],
    ],
  },
});

const lake = (minimumZoom) => ({
  properties: { min_zoom: minimumZoom },
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
        [-1, -1],
      ],
    ],
  },
});

function layer(minimumZoom, maximumZoom, feature) {
  return {
    minimumZoom,
    maximumZoom,
    collection: { features: [feature] },
  };
}

test('switches ranked lake and river detail between zoom ranges', () => {
  const water = prepareCollections({
    lakesOverview: layer(1, 5, lake(2)),
    riversOverview: layer(1, 5, line(2)),
    lakes: layer(6, 8, lake(7)),
    rivers: layer(6, 8, line(6)),
    riversEurope: layer(8, 8, line(8)),
  });

  assert.equal(renderTile({ zoom: 1, x: 1, y: 1 }, water), '');
  const overview = renderTile({ zoom: 2, x: 2, y: 2 }, water);
  assert.match(overview, /class="lake"/);
  assert.match(overview, /class="river"/);

  const zoomSix = renderTile({ zoom: 6, x: 32, y: 32 }, water);
  assert.doesNotMatch(zoomSix, /class="lake"/);
  assert.match(zoomSix, /class="river"/);

  const zoomSeven = renderTile({ zoom: 7, x: 64, y: 64 }, water);
  assert.match(zoomSeven, /class="lake"/);
  assert.match(zoomSeven, /class="river"/);
  assert.doesNotMatch(zoomSeven, /class="river-detail"/);

  const zoomEight = renderTile({ zoom: 8, x: 128, y: 128 }, water);
  assert.match(zoomEight, /class="river"/);
  assert.match(zoomEight, /class="river-detail"/);
});
