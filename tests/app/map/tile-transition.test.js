import assert from 'node:assert/strict';
import {
  revealTileLayer,
  transitionTileLayer,
} from '../../../src/js/app/ui/content/geo/interaction/tile-transition.js';

const descriptors = {
  document: Object.getOwnPropertyDescriptor(globalThis, 'document'),
  requestAnimationFrame: Object.getOwnPropertyDescriptor(
    globalThis,
    'requestAnimationFrame',
  ),
  setTimeout: Object.getOwnPropertyDescriptor(globalThis, 'setTimeout'),
};
const makeElement = () => ({
  classList: {
    values: new Set(),
    add(value) {
      this.values.add(value);
    },
    contains(value) {
      return this.values.has(value);
    },
  },
  style: {
    values: new Map(),
    setProperty(name, value) {
      this.values.set(name, value);
    },
  },
  setAttribute(name, value) {
    this[name] = value;
  },
});
const next = makeElement();
Object.defineProperty(globalThis, 'document', {
  configurable: true,
  value: { createElement: () => next },
});
Object.defineProperty(globalThis, 'requestAnimationFrame', {
  configurable: true,
  value: (callback) => callback(),
});
Object.defineProperty(globalThis, 'setTimeout', {
  configurable: true,
  value: (callback) => callback(),
});
const current = makeElement();
current.remove = () => (current.removed = true);
const marker = makeElement();
const container = {
  insertBefore(element, before) {
    assert.equal(element, next);
    assert.equal(before, marker);
  },
};
const result = transitionTileLayer(container, current, marker, 2);
assert.equal(result, next);
assert.equal(current.style.values.get('--slippy-target-scale'), 2);
assert.equal(current.classList.values.has('is-zoom-active'), true);
assert.equal(next.classList.values.has('is-zoom-ready'), true);
revealTileLayer(next);
revealTileLayer(makeElement());

Object.entries(descriptors).forEach(([name, descriptor]) => {
  Object.defineProperty(
    globalThis,
    name,
    descriptor || { configurable: true, value: undefined },
  );
});

console.log('Map tile transition tests passed.');
