import assert from 'node:assert/strict';

import {
  createMapPitch,
  getMapPitch,
  projectPitchedPoint,
  unprojectPitchedPoint,
} from '../../../src/js/app/ui/content/geo/interaction/map-pitch.js';

assert.equal(getMapPitch(1, 1, 19), 0);
assert.equal(getMapPitch(5, 1, 19), 0);
assert.equal(getMapPitch(19, 1, 19), 68);
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
const mapPitch = createMapPitch({
  container,
  controls,
  initialLayer,
  maximumZoom: 19,
  minimumZoom: 1,
});
const button = controls.children[0];
assert.equal(mapPitch.camera.children[0], initialLayer);
assert.equal(button.attributes['aria-pressed'], 'true');
button.trigger('click');
assert.equal(button.attributes['aria-pressed'], 'false');
button.trigger('click');
assert.equal(button.attributes['aria-pressed'], 'true');
mapPitch.update(12);
mapPitch.update(19, 1);
assert.equal(mapPitch.camera.style.values['--slippy-map-pitch'], '68deg');
assert.equal(container.classList.contains('has-map-pitch'), true);

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
globalThis.document = originalDocument;

console.log('Map perspective tests passed.');
