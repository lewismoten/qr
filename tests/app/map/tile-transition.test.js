import assert from 'node:assert/strict';
import {
  revealTileLayer,
  setTileLayerCoverage,
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
const result = transitionTileLayer(container, current, marker, 1.5, 0.75);
assert.equal(result, next);
assert.equal(current.style.values.get('--slippy-target-scale'), 1.5);
assert.equal(next.style.values.get('--slippy-preview-scale'), 0.75);
assert.equal(current.classList.values.has('is-zoom-active'), true);
assert.equal(next.classList.values.has('is-zoom-ready'), true);
revealTileLayer(next);
revealTileLayer(makeElement());

const noPending = makeElement();
noPending.classList.add('is-zoom-entering');
noPending.slippyPreviousLayer = makeElement();
noPending.slippyPreviousLayer.remove = () => {};
revealTileLayer(noPending);
assert.equal(noPending.classList.values.has('is-zoom-ready'), true);
setTileLayerCoverage(makeElement(), new Set(), new Map());

const pending = makeElement();
const previous = makeElement();
previous.remove = () => (previous.removed = true);
pending.classList.add('is-zoom-entering');
pending.slippyPreviousLayer = previous;
const loadedTile = { slippyLoaded: true };
setTileLayerCoverage(
  pending,
  new Set(['loaded', 'waiting']),
  new Map([['loaded', loadedTile]]),
);
assert.deepEqual([...pending.slippyPendingTiles], ['waiting']);
revealTileLayer(pending);
assert.equal(pending.classList.values.has('is-zoom-ready'), false);
revealTileLayer(pending, true);
assert.equal(pending.classList.values.has('is-zoom-ready'), true);

const completed = makeElement();
completed.classList.add('is-zoom-entering');
completed.slippyPreviousLayer = makeElement();
completed.slippyPreviousLayer.remove = () => {};
setTileLayerCoverage(
  completed,
  new Set(['loaded']),
  new Map([['loaded', loadedTile]]),
);
assert.equal(completed.classList.values.has('is-zoom-ready'), true);

Object.entries(descriptors).forEach(([name, descriptor]) => {
  Object.defineProperty(
    globalThis,
    name,
    descriptor || { configurable: true, value: undefined },
  );
});

console.log('Map tile transition tests passed.');
