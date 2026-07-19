import assert from 'node:assert/strict';
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

console.log('Map wheel zoom tests passed.');
