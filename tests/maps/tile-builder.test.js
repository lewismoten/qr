import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  createTilePlan,
  formatBytes,
  parseBounds,
  parseZoomRange,
} from '../../scripts/maps/tile-plan.mjs';
import {
  prepareCollections,
  renderTile,
} from '../../scripts/maps/tile-renderer.mjs';

describe('SVG map tile planning', () => {
  test('plans complete world zoom ranges', () => {
    const plan = createTilePlan({
      zoom: parseZoomRange('1-2'),
      bounds: parseBounds('world'),
    });

    assert.deepEqual(plan.levels, [
      { zoom: 1, tiles: 4 },
      { zoom: 2, tiles: 16 },
    ]);
    assert.equal(plan.tiles.length, 20);
    assert.deepEqual(parseZoomRange('5'), { minimum: 5, maximum: 5 });
    assert.equal(formatBytes(1536), '1.5 KiB');
  });

  test('rejects invalid zooms and geographic bounds', () => {
    assert.throws(() => parseZoomRange('6-2'), /Zoom must be/);
    assert.throws(() => parseZoomRange('twenty'), /Invalid zoom/);
    assert.throws(() => parseBounds('1,2,3'), /Bounds must be/);
    assert.throws(() => parseBounds('-181,0,1,2'), /outside valid/);
    assert.throws(() => parseBounds('5,0,1,2'), /must increase/);
  });
});

describe('SVG map tile rendering', () => {
  const collections = prepareCollections({
    countries: {
      minimumZoom: 1,
      maximumZoom: 6,
      collection: {
        features: [
          {
            type: 'Feature',
            bbox: [-10, -10, 10, 10],
            properties: {},
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [-10, -10],
                  [10, -10],
                  [10, 10],
                  [-10, 10],
                  [-10, -10],
                ],
              ],
            },
          },
        ],
      },
    },
    cities: {
      minimumZoom: 4,
      maximumZoom: 6,
      collection: {
        features: [
          {
            type: 'Feature',
            properties: { SCALERANK: 1 },
            geometry: { type: 'Point', coordinates: [0, 0] },
          },
        ],
      },
    },
  });

  test('renders only layers active at the requested zoom', () => {
    const low = renderTile({ zoom: 1, x: 1, y: 1 }, collections);
    const detailed = renderTile({ zoom: 4, x: 8, y: 8 }, collections);

    assert.match(low, /class="country"/);
    assert.doesNotMatch(low, /class="city"/);
    assert.match(detailed, /class="city"/);
    assert.equal(renderTile({ zoom: 2, x: 0, y: 0 }, collections), '');
  });
});
