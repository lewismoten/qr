import assert from 'node:assert/strict';
import test from 'node:test';

import { MAP_SOURCES } from '../../scripts/maps/source-config.mjs';
import {
  prepareCollections,
  renderTile,
} from '../../scripts/maps/rendering/tile-renderer.mjs';

test('keeps regional river supplements through zoom level eleven', () => {
  const names = ['riversNorthAmerica', 'riversEurope', 'riversAustralia'];
  for (const name of names) {
    assert.equal(MAP_SOURCES[name].minimumZoom, 8);
    assert.equal(MAP_SOURCES[name].maximumZoom, 11);
  }
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
