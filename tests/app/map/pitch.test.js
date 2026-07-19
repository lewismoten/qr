import assert from 'node:assert/strict';

import {
  createMapPitch,
  getMapPitch,
  getPitchedViewportBounds,
  projectPitchedPoint,
  unprojectPitchedPoint,
} from '../../../src/js/app/ui/content/geo/interaction/map-pitch.js';

assert.equal(getMapPitch(1, 1, 19), 0);
assert.equal(getMapPitch(5, 1, 19), 0);
assert.equal(getMapPitch(19, 1, 19), 60);
assert.equal(getMapPitch(5, 5, 5), 0);
assert.ok(getMapPitch(12, 1, 19) > 0);

const projection = { height: 240, pitch: 52, width: 500 };
const point = { x: 147, y: 92 };
const projected = projectPitchedPoint(point, projection);
const restored = unprojectPitchedPoint(projected, projection);
assert.ok(Math.abs(restored.x - point.x) < 1e-10);
assert.ok(Math.abs(restored.y - point.y) < 1e-10);
assert.deepEqual(
  projectPitchedPoint(point, { ...projection, pitch: 0 }),
  point,
);
assert.deepEqual(
  getPitchedViewportBounds({ height: 240, pitch: 0, width: 500 }),
  { bottom: 240, left: 0, right: 500, top: 0 },
);
const pitchedBounds = getPitchedViewportBounds(projection);
assert.equal(pitchedBounds.bottom, projection.height);
assert.ok(pitchedBounds.top < 0);
assert.ok(pitchedBounds.left < 0);
assert.ok(pitchedBounds.right > projection.width);
const shallowBounds = getPitchedViewportBounds({
  height: 240,
  pitch: 5,
  width: 500,
});
assert.ok(shallowBounds.top <= 0);
const deepestProjection = { height: 300, pitch: 60, width: 430 };
const deepestBounds = getPitchedViewportBounds(deepestProjection);
const deepestTop = projectPitchedPoint(
  { x: deepestProjection.width / 2, y: deepestBounds.top },
  deepestProjection,
);
assert.ok(deepestTop.y <= 1);
assert.ok(deepestBounds.right - deepestBounds.left < 4 * 430);
assert.deepEqual(
  unprojectPitchedPoint(point, { ...projection, pitch: 0 }),
  point,
);
const customProjection = { ...projection, perspective: 1000 };
const customProjected = projectPitchedPoint(point, customProjection);
const customRestored = unprojectPitchedPoint(customProjected, customProjection);
assert.ok(Math.abs(customRestored.x - point.x) < 1e-10);
assert.ok(Math.abs(customRestored.y - point.y) < 1e-10);

function makeClassList(element) {
  const names = new Set();
  return {
    add: (...values) => values.forEach((value) => names.add(value)),
    contains: (value) => names.has(value),
    remove: (...values) => values.forEach((value) => names.delete(value)),
    toggle(value, force) {
      const enabled = force ?? !names.has(value);
      if (enabled) names.add(value);
      else names.delete(value);
      element.className = [...names].join(' ');
      return enabled;
    },
  };
}

function makeElement() {
  const listeners = {};
  const element = {
    attributes: {},
    children: [],
    className: '',
    style: {
      values: {},
      setProperty(name, value) {
        this.values[name] = value;
      },
    },
    addEventListener(name, handler) {
      listeners[name] = handler;
    },
    append(...children) {
      this.children.push(...children);
    },
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
    trigger(name) {
      listeners[name]?.();
    },
  };
  element.classList = makeClassList(element);
  return element;
}

const originalDocument = globalThis.document;
globalThis.document = { createElement: makeElement };
const container = makeElement();
container.clientHeight = 240;
container.clientWidth = 500;
container.getBoundingClientRect = () => ({
  height: 240,
  left: 10,
  top: 20,
  width: 500,
});
const controls = makeElement();
const initialLayer = makeElement();
let changes = 0;
const mapPitch = createMapPitch({
  container,
  controls,
  initialLayer,
  maximumZoom: 19,
  minimumZoom: 1,
  onChange: () => (changes += 1),
});
const button = controls.children[0];
assert.equal(mapPitch.camera.children[0], initialLayer);
assert.equal(button.attributes['aria-pressed'], 'true');
button.trigger('click');
assert.equal(button.attributes['aria-pressed'], 'false');
assert.equal(changes, 1);
button.trigger('click');
assert.equal(button.attributes['aria-pressed'], 'true');
mapPitch.update(12);
mapPitch.update(19, 1);
assert.equal(mapPitch.camera.style.values['--slippy-map-pitch'], '60deg');
assert.equal(container.classList.contains('has-map-pitch'), true);
assert.ok(mapPitch.getViewportBounds().top < 0);

const screenPoint = mapPitch.projectPoint(point);
const mapClient = mapPitch.toMapClient(screenPoint.x + 10, screenPoint.y + 20);
assert.ok(Math.abs(mapClient.clientX - point.x - 10) < 1e-10);
assert.ok(Math.abs(mapClient.clientY - point.y - 20) < 1e-10);

button.trigger('click');
assert.equal(button.attributes['aria-pressed'], 'false');
assert.equal(mapPitch.camera.style.values['--slippy-map-pitch'], '0deg');
button.trigger('click');
assert.equal(button.attributes['aria-pressed'], 'true');
mapPitch.camera.trigger('transitionend');
assert.equal(
  mapPitch.camera.classList.contains('is-pitch-transitioning'),
  false,
);
assert.equal(container.classList.contains('is-map-pitch-transitioning'), false);
const defaultControls = makeElement();
const defaultChangePitch = createMapPitch({
  container,
  controls: defaultControls,
  initialLayer: makeElement(),
  maximumZoom: 19,
  minimumZoom: 1,
});
defaultChangePitch.update(1);
defaultControls.children[0].trigger('click');
globalThis.document = originalDocument;

console.log('Map perspective tests passed.');
