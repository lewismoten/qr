import assert from 'node:assert/strict';
import test from 'node:test';

import { MAP_SOURCES } from '../../scripts/maps/source-config.mjs';
import {
  prepareCollections,
  renderTile,
} from '../../scripts/maps/rendering/tile-renderer.mjs';

test('keeps secondary roads through the most detailed local zoom', () => {
  assert.equal(MAP_SOURCES.secondaryRoads.minimumZoom, 8);
  assert.equal(MAP_SOURCES.secondaryRoads.maximumZoom, 9);
  assert.match(MAP_SOURCES.secondaryRoads.url, /MapServer\/3\/query/);
});

test('excludes configured countries and honors road zoom rankings', () => {
  const road = (country, minimumZoom, type = 'Major Highway') => ({
    properties: { sov_a3: country, min_zoom: minimumZoom, type },
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
      maximumZoom: 9,
      featureFilter: { property: 'sov_a3', exclude: ['USA'] },
      collection: {
        features: [
          road('USA', 3),
          road('CAN', 7),
          road('CAN', 8, 'Secondary Highway'),
        ],
      },
    },
    secondaryRoads: {
      minimumZoom: 8,
      maximumZoom: 9,
      collection: { features: [road('USA', 8)] },
    },
  });

  assert.equal(roads.naturalEarthRoads.features.length, 2);
  assert.equal(renderTile({ zoom: 6, x: 32, y: 32 }, roads), '');
  assert.match(
    renderTile({ zoom: 7, x: 64, y: 64 }, roads),
    /class="primary-road"/,
  );
  const zoomEight = renderTile({ zoom: 8, x: 128, y: 128 }, roads);
  assert.match(zoomEight, /class="primary-road"/);
  assert.match(zoomEight, /class="secondary-road"/);
  const zoomNine = renderTile({ zoom: 9, x: 256, y: 256 }, roads);
  assert.match(zoomNine, /class="primary-road"/);
  assert.match(zoomNine, /class="secondary-road"/);
});
