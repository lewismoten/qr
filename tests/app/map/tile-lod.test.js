import assert from 'node:assert/strict';

import { getTileLod } from '../../../src/js/app/ui/content/geo/data/tile-lod.js';

const options = {
  lastY: 100,
  maximumSourceZoom: 9,
  minimumSourceZoom: 1,
  x: 72,
  zoom: 16,
};

assert.deepEqual(getTileLod({ ...options, y: 100 }), {
  key: '16:72:100@9',
  sourceZoom: 9,
});
assert.equal(getTileLod({ ...options, y: 99 }).sourceZoom, 9);
assert.equal(getTileLod({ ...options, y: 98 }).sourceZoom, 9);
assert.equal(getTileLod({ ...options, y: 97 }).sourceZoom, 8);
assert.equal(getTileLod({ ...options, y: 96 }).sourceZoom, 7);
assert.equal(getTileLod({ ...options, y: 90 }).sourceZoom, 1);
assert.equal(getTileLod({ ...options, y: 101 }).sourceZoom, 9);
assert.equal(
  getTileLod({
    ...options,
    maximumSourceZoom: 19,
    y: 100,
    zoom: 6,
  }).sourceZoom,
  6,
);

console.log('Map distance tile detail tests passed.');
