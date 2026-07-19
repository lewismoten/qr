import assert from 'node:assert/strict';
import {
  attachSmoothWheelZoom,
  createSmoothWheelZoomHandler,
} from '../../../src/js/app/ui/content/geo/interaction/smooth-wheel-zoom.js';
import {
  centerZoomAtEvent,
  centerZoomAtPointer,
  coordinatesAtPointer,
} from '../../../src/js/app/ui/content/geo/interaction/pointer-zoom.js';
import { createWheelZoomHandler } from '../../../src/js/app/ui/content/geo/interaction/wheel-zoom.js';
import { projectCoordinates } from '../../../src/js/app/ui/content/geo/projection.js';
import {
  createZoomChrome,
  getZoomStatus,
} from '../../../src/js/app/ui/content/geo/interaction/zoom-status.js';

assert.deepEqual(getZoomStatus(4, 1), {
  emptying: true,
  lower: 4,
  percent: 0,
  upper: 5,
  zoom: '4.00',
});
assert.deepEqual(getZoomStatus(4, Math.SQRT2), {
  emptying: true,
  lower: 4,
  percent: 50,
  upper: 5,
  zoom: '4.50',
});
assert.deepEqual(getZoomStatus(4, 1 / Math.SQRT2), {
  emptying: false,
  lower: 3,
  percent: 50,
  upper: 4,
  zoom: '3.50',
});
assert.deepEqual(getZoomStatus(3, Math.SQRT2), {
  emptying: false,
  lower: 3,
  percent: 50,
  upper: 4,
  zoom: '3.50',
});

const documentDescriptor = Object.getOwnPropertyDescriptor(
  globalThis,
  'document',
);
globalThis.document = {
  createElement(tag) {
    const listeners = {};
    return {
      attributes: {},
      children: [],
      classList: {
        values: new Set(),
        toggle(name, enabled) {
          if (enabled) this.values.add(name);
          else this.values.delete(name);
        },
      },
      style: {
        setProperty(name, value) {
          this[name] = value;
        },
      },
      tag,
      append(...children) {
        this.children.push(...children);
      },
      addEventListener(name, handler) {
        listeners[name] = handler;
      },
      dispatch(name) {
        listeners[name]();
      },
      setAttribute(name, value) {
        this.attributes[name] = value;
      },
    };
  },
};
const overlayChanges = [];
const chrome = createZoomChrome((enabled) => overlayChanges.push(enabled));
chrome.update(4, Math.SQRT2);
assert.equal(chrome.controls.children.length, 3);
assert.equal(chrome.status.children.length, 1);
assert.equal(chrome.status.children[0].textContent, 4);
assert.equal(chrome.status.className, 'slippy-map-zoom-status is-emptying');
assert.equal(chrome.status.style['--slippy-zoom-progress'], '50%');
assert.equal(
  chrome.status.attributes['aria-label'],
  'Layer 4; zoom 4.50; 50% from level 4 to 5.',
);
chrome.update(3, Math.SQRT2);
assert.equal(chrome.status.children[0].textContent, 3);
assert.equal(chrome.status.className, 'slippy-map-zoom-status');
assert.equal(chrome.status.style['--slippy-zoom-progress'], '50%');
chrome.update(4, Math.SQRT2, 3);
assert.equal(
  chrome.status.className,
  'slippy-map-zoom-status is-emptying is-fallback',
);
assert.match(chrome.status.attributes['aria-label'], /enlarged from/);
chrome.update(9, Math.SQRT2, 9);
assert.equal(chrome.status.className, 'slippy-map-zoom-status');
chrome.status.children[0].dispatch('click');
assert.deepEqual(overlayChanges, [true]);
assert.equal(chrome.status.children[0].attributes['aria-pressed'], 'true');
chrome.update(10, 1, 9);
assert.equal(
  chrome.status.className,
  'slippy-map-zoom-status is-emptying is-fallback has-tile-overlay',
);
chrome.status.children[0].dispatch('click');
assert.deepEqual(overlayChanges, [true, false]);
createZoomChrome().status.children[0].dispatch('click');
Object.defineProperty(
  globalThis,
  'document',
  documentDescriptor || { configurable: true, value: undefined },
);

const pointerView = {
  center: { latitude: 20, longitude: -30 },
  offset: { x: 90, y: -45 },
  scale: 1,
  zoom: 4,
  nextScale: Math.SQRT2,
  nextZoom: 5,
};
const pointerCenter = centerZoomAtPointer(pointerView);
const before = projectCoordinates(pointerView.center, pointerView.zoom);
const beforeAnchor = {
  x: before.x + pointerView.offset.x / pointerView.scale,
  y: before.y + pointerView.offset.y / pointerView.scale,
};
const after = projectCoordinates(pointerCenter, pointerView.nextZoom);
const afterAnchor = {
  x: after.x + pointerView.offset.x / pointerView.nextScale,
  y: after.y + pointerView.offset.y / pointerView.nextScale,
};
const projectedAnchor = projectCoordinates(
  centerZoomAtPointer({
    ...pointerView,
    offset: { x: 0, y: 0 },
    nextScale: 1,
    nextZoom: pointerView.zoom,
  }),
  pointerView.zoom,
);
assert.ok(Math.abs(afterAnchor.x / 2 - beforeAnchor.x) < 1e-9);
assert.ok(Math.abs(afterAnchor.y / 2 - beforeAnchor.y) < 1e-9);
assert.deepEqual(projectedAnchor, before);
assert.equal(centerZoomAtEvent(null, null, pointerView), pointerView.center);
assert.deepEqual(
  centerZoomAtEvent(
    {
      getBoundingClientRect: () => ({
        height: 0,
        left: 0,
        top: 0,
        width: 0,
      }),
    },
    { clientX: 90, clientY: -45 },
    {
      center: pointerView.center,
      scale: pointerView.scale,
      zoom: pointerView.zoom,
      nextScale: pointerView.nextScale,
      nextZoom: pointerView.nextZoom,
    },
  ),
  pointerCenter,
);
assert.deepEqual(
  coordinatesAtPointer(
    {
      getBoundingClientRect: () => ({
        height: 200,
        left: 10,
        top: 20,
        width: 400,
      }),
    },
    210,
    120,
    { center: pointerView.center, scale: 1, zoom: 4 },
  ),
  pointerView.center,
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
const commitEvents = [];
const smoothWheel = createSmoothWheelZoomHandler(
  {
    onPreview: (scale) => previews.push(scale),
    onCommit: (step, scale, event) => {
      commits.push({ scale, step });
      commitEvents.push(event);
    },
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
const commitEvent = wheelEvent(1000, 30);
smoothWheel(commitEvent);
assert.ok(previews.at(-1) > 1);
assert.equal(commits[0].step, -1);
assert.ok(commits[0].scale > 1);
assert.equal(commitEvents[0], commitEvent);
smoothWheel(wheelEvent(80, 40));
assert.equal(commits.length, 1);

const properties = new Map();
const attachedPreviews = [];
const attachedPreviewEvents = [];
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
  (scale, event) => {
    attachedPreviews.push(scale);
    attachedPreviewEvents.push(event);
  },
);
const attachedEvent = wheelEvent(-320, 30);
attachedHandler(attachedEvent);
assert.ok(properties.get('--slippy-preview-scale') < 1);
assert.deepEqual(attachedPreviews, [properties.get('--slippy-preview-scale')]);
assert.deepEqual(attachedPreviewEvents, [attachedEvent]);

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
