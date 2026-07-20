import assert from 'node:assert/strict';

import {
  FRONT_ROYAL,
  getCenteredTileLayout,
} from '../../../../src/js/info/geo-layer-layout.js';

const level = getCenteredTileLayout(13);
assert.deepEqual(level.centerTile, {
  zoom: 13,
  x: 2316,
  y: 3133,
});
assert.equal(level.tiles.length, 4);
assert.equal(level.tiles.filter(({ isCenter }) => isCenter).length, 1);

const center = level.tiles.find(({ isCenter }) => isCenter);
assert.ok(center.left <= 50 && center.left + 100 >= 50);
assert.ok(center.top <= 50 && center.top + 100 >= 50);

const bounds = level.tiles.reduce(
  (result, item) => ({
    bottom: Math.max(result.bottom, item.top + 100),
    left: Math.min(result.left, item.left),
    right: Math.max(result.right, item.left + 100),
    top: Math.min(result.top, item.top),
  }),
  { bottom: -Infinity, left: Infinity, right: -Infinity, top: Infinity },
);
assert.ok(bounds.left <= 0 && bounds.right >= 100);
assert.ok(bounds.top <= 0 && bounds.bottom >= 100);

assert.deepEqual(FRONT_ROYAL, {
  latitude: 38.9182,
  longitude: -78.1944,
});
