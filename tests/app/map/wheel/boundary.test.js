import assert from 'node:assert/strict';
import { test } from 'node:test';

const smoothWheelPath =
  '../../../../src/js/app/ui/content/geo/interaction/' + 'smooth-wheel-zoom.js';
const { createSmoothWheelZoomHandler } = await import(smoothWheelPath);

const wheelEvent = (deltaY) => ({
  deltaMode: 0,
  deltaY,
  preventDefault() {},
});

test('stops fractional wheel zoom at the maximum level', () => {
  let zoom = 19;
  const previews = [];
  const commits = [];
  const wheel = createSmoothWheelZoomHandler({
    onPreview: (scale) => previews.push(scale),
    onCommit: (step) => commits.push(step),
    canZoom: (step) => step < 0 || zoom < 19,
  });

  wheel(wheelEvent(-120));
  wheel(wheelEvent(-120));
  assert.deepEqual(previews, [1, 1]);
  assert.deepEqual(commits, []);

  wheel(wheelEvent(120));
  assert.equal(previews.at(-1), 1);
  assert.deepEqual(commits, [-1]);

  zoom = 18;
  wheel(wheelEvent(-120));
  assert.deepEqual(commits, [-1, 1]);
});
