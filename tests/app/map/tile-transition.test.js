import assert from 'node:assert/strict';
import {
  revealTileLayer,
  setTileLayerCoverage,
  syncTileLayerView,
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
assert.equal(current.style.values.get('--slippy-preview-scale'), 1.5);
assert.equal(current.slippyTargetScale, 1.5);
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

const retained = makeElement();
retained.slippyTargetScale = 1.5;
retained.slippyView = {
  centerPoint: { x: 512, y: 512 },
  zoom: 2,
};
const active = makeElement();
active.slippyPreviousLayer = retained;
syncTileLayerView(active, { latitude: 0, longitude: 10 }, 3, { x: 1, y: 2 });
assert.deepEqual(active.slippyView, {
  centerPoint: { x: 1, y: 2 },
  zoom: 3,
});
assert.ok(
  Math.abs(
    Number.parseFloat(retained.style.values.get('--slippy-offset-x')) +
      42.66666666666667,
  ) < 1e-10,
);
assert.equal(retained.style.values.get('--slippy-offset-y'), '0px');
retained.slippyView.centerPoint.x = 1000;
syncTileLayerView(active, { latitude: 0, longitude: -170 }, 3, { x: 1, y: 2 });
assert.ok(
  Number.parseFloat(retained.style.values.get('--slippy-offset-x')) < 0,
);
retained.slippyView.centerPoint.x = 20;
syncTileLayerView(active, { latitude: 0, longitude: 170 }, 3, { x: 1, y: 2 });
assert.ok(
  Number.parseFloat(retained.style.values.get('--slippy-offset-x')) > 0,
);
syncTileLayerView(makeElement(), { latitude: 0, longitude: 0 }, 2, {
  x: 0,
  y: 0,
});

Object.entries(descriptors).forEach(([name, descriptor]) => {
  Object.defineProperty(
    globalThis,
    name,
    descriptor || { configurable: true, value: undefined },
  );
});

console.log('Map tile transition tests passed.');
