import assert from 'node:assert/strict';
import {
  attachSmoothWheelZoom,
  createSmoothWheelZoomHandler,
} from '../../../src/js/app/ui/content/geo/interaction/smooth-wheel-zoom.js';
import { createWheelZoomHandler } from '../../../src/js/app/ui/content/geo/interaction/wheel-zoom.js';

const wheelSteps = [];
let prevented = 0;
const wheel = createWheelZoomHandler((step) => wheelSteps.push(step));
const wheelEvent = (deltaY, timeStamp, deltaMode = 0) => ({
  deltaMode,
  deltaY,
  preventDefault: () => (prevented += 1),
  timeStamp,
});
wheel(wheelEvent(20, 0));
wheel(wheelEvent(20, 10));
wheel(wheelEvent(20, 20));
wheel(wheelEvent(20, 30));
wheel(wheelEvent(100, 40));
wheel(wheelEvent(-1, 220, 2));
wheel(wheelEvent(5, 450, 1));
assert.deepEqual(wheelSteps, [-1, 1, -1]);
assert.equal(prevented, 7);

const reversedSteps = [];
const reversedWheel = createWheelZoomHandler(
  (step) => reversedSteps.push(step),
  { threshold: 40, cooldown: 50 },
);
reversedWheel(wheelEvent(20, Number.NaN));
reversedWheel(wheelEvent(-20, 10));
reversedWheel(wheelEvent(-20, 20));
assert.deepEqual(reversedSteps, [1]);

const previews = [];
const commits = [];
const smoothWheel = createSmoothWheelZoomHandler(
  {
    onPreview: (scale) => previews.push(scale),
    onCommit: (step, scale) => commits.push({ scale, step }),
  },
  {
    sensitivity: 320,
    commitThreshold: 0.75,
  },
);
smoothWheel(wheelEvent(-80, 0));
smoothWheel(wheelEvent(-80, 10));
assert.ok(previews[1] > previews[0]);
assert.deepEqual(commits, []);
smoothWheel(wheelEvent(0, 20));
assert.deepEqual(commits, []);
smoothWheel(wheelEvent(1000, 30));
assert.ok(previews.at(-1) > 1);
assert.equal(commits[0].step, -1);
assert.ok(commits[0].scale > 1);
smoothWheel(wheelEvent(80, 40));
assert.equal(commits.length, 1);

const properties = new Map();
let attachedHandler;
const layer = {
  style: {
    setProperty(name, value) {
      properties.set(name, value);
    },
  },
};
attachSmoothWheelZoom(
  {
    addEventListener(name, handler, options) {
      assert.equal(name, 'wheel');
      assert.deepEqual(options, { passive: false });
      attachedHandler = handler;
    },
  },
  () => layer,
  (step) => commits.push(step),
);
attachedHandler(wheelEvent(-320, 30));
assert.ok(properties.get('--slippy-preview-scale') < 1);

console.log('Map wheel zoom tests passed.');
