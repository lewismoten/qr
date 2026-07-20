import assert from 'node:assert/strict';
import test from 'node:test';

import { MAP_SOURCES } from '../../scripts/maps/source-config.mjs';
import {
  prepareCollections,
  renderTile,
} from '../../scripts/maps/rendering/tile-renderer.mjs';

test('increases secondary-road detail at zoom levels twelve and fourteen', () => {
  assert.equal(MAP_SOURCES.secondaryRoads.minimumZoom, 8);
  assert.equal(MAP_SOURCES.secondaryRoads.maximumZoom, 11);
  assert.match(MAP_SOURCES.secondaryRoads.url, /MapServer\/3\/query/);
  assert.equal(MAP_SOURCES.secondaryRoadsDetailed.minimumZoom, 12);
  assert.equal(MAP_SOURCES.secondaryRoadsDetailed.maximumZoom, 13);
  assert.match(MAP_SOURCES.secondaryRoadsDetailed.url, /MapServer\/5\/query/);
  assert.match(
    MAP_SOURCES.secondaryRoadsDetailed.url,
    /maxAllowableOffset=0\.0005/,
  );
  assert.equal(MAP_SOURCES.secondaryRoadsLocal.minimumZoom, 14);
  assert.equal(MAP_SOURCES.secondaryRoadsLocal.maximumZoom, 16);
  assert.match(MAP_SOURCES.secondaryRoadsLocal.url, /MapServer\/6\/query/);
  assert.match(
    MAP_SOURCES.secondaryRoadsLocal.url,
    /maxAllowableOffset=0\.00015/,
  );
  assert.match(MAP_SOURCES.secondaryRoadsLocal.url, /geometryPrecision=5/);
  assert.equal(MAP_SOURCES.mainRoads.minimumZoom, 15);
  assert.equal(MAP_SOURCES.mainRoads.maximumZoom, 16);
  assert.equal(MAP_SOURCES.mainRoads.maximumFeatures, 30000);
  assert.match(MAP_SOURCES.mainRoads.url, /BASENAME%3D%27Main%27/);
  assert.match(MAP_SOURCES.mainRoads.idsUrl, /returnIdsOnly=true/);
  assert.equal(MAP_SOURCES.localRoads.minimumZoom, 16);
  assert.equal(MAP_SOURCES.localRoads.maximumZoom, 16);
  assert.equal(MAP_SOURCES.localRoads.maximumFeatures, 600000);
  assert.match(MAP_SOURCES.localRoads.url, /MapServer\/7\/query/);
  assert.match(MAP_SOURCES.localRoads.url, /STGEOMETRY_Length%3E%3D10000/);
  assert.match(MAP_SOURCES.localRoads.idsUrl, /returnIdsOnly=true/);
});

test('uses progressively detailed Census railroads at zoom ten', () => {
  const overview = MAP_SOURCES.railroadsOverview;
  const detailed = MAP_SOURCES.railroadsDetailed;
  const local = MAP_SOURCES.railroadsLocal;
  assert.deepEqual([overview.minimumZoom, overview.maximumZoom], [10, 11]);
  assert.deepEqual([detailed.minimumZoom, detailed.maximumZoom], [12, 13]);
  assert.deepEqual([local.minimumZoom, local.maximumZoom], [14, 16]);
  assert.match(overview.url, /Transportation_LargeScale\/MapServer\/3/);
  assert.match(overview.url, /outFields=OBJECTID%2CMTFCC/);
  assert.match(overview.url, /maxAllowableOffset=0\.002/);
  assert.match(detailed.url, /maxAllowableOffset=0\.0005/);
  assert.match(local.url, /maxAllowableOffset=0\.0001/);
  assert.match(local.url, /geometryPrecision=5/);
});

test('renders railroads only within their configured zoom ranges', () => {
  const line = {
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: [
        [-1, 0],
        [1, 0],
      ],
    },
  };
  const railroads = prepareCollections({
    railroadsOverview: {
      minimumZoom: 10,
      maximumZoom: 11,
      collection: { features: [line] },
    },
    railroadsDetailed: {
      minimumZoom: 12,
      maximumZoom: 13,
      collection: { features: [line] },
    },
    railroadsLocal: {
      minimumZoom: 14,
      maximumZoom: 16,
      collection: { features: [line] },
    },
  });

  assert.equal(renderTile({ zoom: 9, x: 256, y: 256 }, railroads), '');
  assert.match(
    renderTile({ zoom: 10, x: 512, y: 512 }, railroads),
    /class="railway"/,
  );
  assert.match(
    renderTile({ zoom: 12, x: 2048, y: 2048 }, railroads),
    /class="railway"/,
  );
  assert.match(
    renderTile({ zoom: 14, x: 8192, y: 8192 }, railroads),
    /class="railway"/,
  );
  assert.match(
    renderTile({ zoom: 16, x: 32768, y: 32768 }, railroads),
    /class="railway"/,
  );
  assert.equal(renderTile({ zoom: 17, x: 65536, y: 65536 }, railroads), '');
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

test('renders protected lands as areas, lines, and points', () => {
  const polygon = {
    properties: {},
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
  };
  const line = {
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: [
        [-1, 0],
        [1, 0],
      ],
    },
  };
  const point = {
    properties: {},
    geometry: { type: 'Point', coordinates: [0, 0] },
  };
  const parks = prepareCollections({
    protectedAreas: {
      minimumZoom: 6,
      maximumZoom: 13,
      collection: { features: [polygon] },
    },
    protectedLines: {
      minimumZoom: 7,
      maximumZoom: 13,
      collection: { features: [line] },
    },
    protectedPoints: {
      minimumZoom: 8,
      maximumZoom: 13,
      collection: { features: [point] },
    },
  });

  const tile = renderTile({ zoom: 8, x: 128, y: 128 }, parks);
  assert.match(tile, /class="protected-area"/);
  assert.match(tile, /class="protected-line"/);
  assert.match(tile, /class="protected-point"/);
  assert.equal(MAP_SOURCES.protectedAreas.maximumZoom, 16);
  assert.match(MAP_SOURCES.protectedPoints.url, /protected_lands_point/);
});
