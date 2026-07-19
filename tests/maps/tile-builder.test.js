import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  clipPolygon,
  clipPolyline,
} from '../../scripts/maps/geometry-clip.mjs';
import {
  createTilePlan,
  formatBytes,
  parseBounds,
  parseZoomRange,
} from '../../scripts/maps/tile-plan.mjs';
import {
  prepareCollections,
  renderTile,
  renderTileWithinSize,
} from '../../scripts/maps/tile-renderer.mjs';
import {
  addAvailableTile,
  serializeTileAvailability,
} from '../../scripts/maps/tile-availability.mjs';

describe('SVG map tile availability', () => {
  test('compresses available rows into sorted inclusive ranges', () => {
    const index = new Map();
    for (const tile of [
      { zoom: 4, x: 3, y: 7 },
      { zoom: 4, x: 3, y: 5 },
      { zoom: 4, x: 3, y: 6 },
      { zoom: 4, x: 3, y: 10 },
      { zoom: 2, x: 1, y: 1 },
    ]) {
      addAvailableTile(index, tile);
    }
    assert.deepEqual(serializeTileAvailability(index), {
      2: { 1: [1, 1] },
      4: { 3: [5, 7, 10, 10] },
    });
  });
});

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

describe('SVG map geometry clipping', () => {
  test('clips polygons and lines to the tile boundary', () => {
    const bounds = {
      minimumX: 0,
      minimumY: 0,
      maximumX: 10,
      maximumY: 10,
    };
    assert.deepEqual(
      clipPolygon(
        [
          [-5, -5],
          [15, -5],
          [15, 15],
          [-5, 15],
          [-5, -5],
        ],
        bounds,
      ),
      [
        [0, 10],
        [0, 0],
        [10, 0],
        [10, 10],
      ],
    );
    assert.deepEqual(
      clipPolyline(
        [
          [-5, 5],
          [5, 5],
          [15, 5],
        ],
        bounds,
      ),
      [
        [
          [0, 5],
          [5, 5],
          [10, 5],
        ],
      ],
    );
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
            properties: { min_zoom: 2.1, scalerank: 1 },
            geometry: { type: 'Point', coordinates: [0, 0] },
          },
          {
            type: 'Feature',
            properties: { MIN_ZOOM: 5, SCALERANK: 4 },
            geometry: { type: 'Point', coordinates: [0, 0] },
          },
        ],
      },
    },
    regions: {
      minimumZoom: 4,
      maximumZoom: 7,
      collection: {
        features: [
          {
            type: 'Feature',
            properties: { ADM0_A3: 'USA' },
            geometry: {
              type: 'LineString',
              coordinates: [
                [-1, -1],
                [1, 1],
              ],
            },
          },
        ],
      },
    },
    primaryRoadsOverview: {
      minimumZoom: 6,
      maximumZoom: 7,
      collection: {
        features: [
          {
            type: 'Feature',
            properties: { MTFCC: 'S1100' },
            geometry: {
              type: 'LineString',
              coordinates: [
                [-1, 0],
                [1, 0],
              ],
            },
          },
        ],
      },
    },
    states: {
      minimumZoom: 7,
      maximumZoom: 7,
      collection: {
        features: [
          {
            type: 'Feature',
            properties: { GEOID: '51' },
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
          },
        ],
      },
    },
    subdivisions: {
      minimumZoom: 7,
      maximumZoom: 7,
      collection: {
        features: [
          {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: [
                [-1, -1],
                [1, 1],
              ],
            },
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
    assert.equal(detailed.match(/class="city"/g)?.length, 1);
    assert.equal(
      renderTile({ zoom: 5, x: 16, y: 16 }, collections).match(/class="city"/g)
        ?.length,
      2,
    );
    assert.match(
      renderTile({ zoom: 6, x: 32, y: 32 }, collections),
      /class="primary-road"/,
    );
    assert.match(
      renderTile({ zoom: 7, x: 64, y: 64 }, collections),
      /class="subdivision"/,
    );
    const countyTile = renderTile({ zoom: 7, x: 64, y: 64 }, collections);
    assert.match(countyTile, /class="state-boundary"/);
    assert.doesNotMatch(countyTile, /class="region"/);
    assert.equal(renderTile({ zoom: 2, x: 0, y: 0 }, collections), '');
  });

  test('simplifies only tiles that exceed their byte target', () => {
    const tile = { zoom: 4, x: 8, y: 8 };
    const original = renderTile(tile, collections);
    const unchanged = renderTileWithinSize(tile, collections, original.length);
    const simplified = renderTileWithinSize(tile, collections, 1);

    assert.equal(unchanged.tolerance, 0.45);
    assert.equal(unchanged.svg, original);
    assert.equal(simplified.tolerance, 48);
    assert.ok(simplified.svg.length <= original.length);
    assert.equal(simplified.originalBytes, original.length);
  });
});
