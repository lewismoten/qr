import assert from 'node:assert/strict';
import {
  attachSmoothWheelZoom,
  createSmoothWheelZoomHandler,
} from '../../../src/js/app/ui/content/geo/interaction/smooth-wheel-zoom.js';
import { createWheelZoomHandler } from '../../../src/js/app/ui/content/geo/interaction/wheel-zoom.js';
import {
  createZoomChrome,
  getZoomStatus,
} from '../../../src/js/app/ui/content/geo/interaction/zoom-status.js';

assert.deepEqual(getZoomStatus(4, 1), {
  lower: 4,
  percent: 0,
  tileLayer: 4,
  upper: 5,
  zoom: '4.00',
});
assert.deepEqual(getZoomStatus(4, Math.SQRT2), {
  lower: 4,
  percent: 50,
  tileLayer: 4,
  upper: 5,
  zoom: '4.50',
});
assert.deepEqual(getZoomStatus(4, 1 / Math.SQRT2), {
  lower: 3,
  percent: 50,
  tileLayer: 4,
  upper: 4,
  zoom: '3.50',
});
assert.deepEqual(getZoomStatus(12, Math.SQRT2, 8), {
  lower: 12,
  percent: 50,
  tileLayer: 8,
  upper: 13,
  zoom: '12.50',
});

const documentDescriptor = Object.getOwnPropertyDescriptor(
  globalThis,
  'document',
);
globalThis.document = {
  createElement(tag) {
    return {
      attributes: {},
      children: [],
      style: {},
      tag,
      append(...children) {
        this.children.push(...children);
      },
      setAttribute(name, value) {
        this.attributes[name] = value;
      },
    };
  },
};
const chrome = createZoomChrome();
chrome.update(4, Math.SQRT2);
assert.equal(chrome.controls.children.length, 2);
assert.equal(chrome.status.children[0].children[0].textContent, 'Layer 4');
assert.equal(chrome.status.children[0].children[1].textContent, 'Zoom 4.50');
assert.equal(
  chrome.status.children[1].children[1].children[0].style.width,
  '50%',
);
assert.equal(
  chrome.status.attributes['aria-label'],
  'Zoom 4.50; 50% from level 4 to 5.',
);
Object.defineProperty(
  globalThis,
  'document',
  documentDescriptor || { configurable: true, value: undefined },
);

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
const attachedPreviews = [];
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
  (scale) => attachedPreviews.push(scale),
);
attachedHandler(wheelEvent(-320, 30));
assert.ok(properties.get('--slippy-preview-scale') < 1);
assert.deepEqual(attachedPreviews, [properties.get('--slippy-preview-scale')]);

let noPreviewHandler;
attachSmoothWheelZoom(
  {
    addEventListener(_name, handler) {
      noPreviewHandler = handler;
    },
  },
  () => layer,
  () => {},
);
noPreviewHandler(wheelEvent(10, 40));

console.log('Map wheel zoom tests passed.');
