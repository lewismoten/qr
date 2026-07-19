import assert from 'node:assert/strict';
import test from 'node:test';

import {
  prepareCollections,
  renderTile,
} from '../../scripts/maps/tile-renderer.mjs';

test('excludes configured countries and honors road zoom rankings', () => {
  const road = (country, minimumZoom) => ({
    properties: { sov_a3: country, min_zoom: minimumZoom },
    geometry: {
      type: 'LineString',
      coordinates: [
        [-1, 0],
        [1, 0],
      ],
    },
  });
  const roads = prepareCollections({
    naturalEarthRoads: {
      minimumZoom: 6,
      maximumZoom: 8,
      featureFilter: { property: 'sov_a3', exclude: ['USA'] },
      collection: {
        features: [road('USA', 3), road('CAN', 7)],
      },
    },
  });

  assert.equal(roads.naturalEarthRoads.features.length, 1);
  assert.equal(renderTile({ zoom: 6, x: 32, y: 32 }, roads), '');
  assert.match(
    renderTile({ zoom: 7, x: 64, y: 64 }, roads),
    /class="primary-road"/,
  );
});
