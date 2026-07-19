import assert from 'node:assert/strict';

import { getVisibleTileRange } from '../../../src/js/app/ui/content/geo/data/tile-range.js';

const center = { x: 1024, y: 1024 };
const standard = getVisibleTileRange({
  center,
  width: 512,
  height: 256,
  zoom: 3,
  scale: 1,
});
const fractional = getVisibleTileRange({
  center,
  width: 512,
  height: 256,
  zoom: 3,
  scale: 0.5,
});
const panned = getVisibleTileRange({
  center: { x: 1280, y: 1024 },
  width: 512,
  height: 256,
  zoom: 3,
  scale: 0.5,
});

assert.ok(fractional.firstX < standard.firstX);
assert.ok(fractional.lastX > standard.lastX);
assert.equal(panned.firstX, fractional.firstX + 1);
assert.equal(panned.lastX, fractional.lastX + 1);
assert.ok(standard.firstY >= 0);
assert.ok(standard.lastY <= 7);

console.log('Map fractional tile range tests passed.');
