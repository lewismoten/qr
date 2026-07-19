import assert from 'node:assert/strict';

import {
  createFallbackTile,
  getFallbackTile,
  loadLocalTileRange,
} from '../../../src/js/app/ui/content/geo/tile-fallback.js';
import { renderTile } from '../../../src/js/app/ui/content/geo/data/tile-rendering.js';

assert.deepEqual(getFallbackTile({ zoom: 8, x: 73, y: 99 }, 6), {
  zoom: 6,
  x: 18,
  y: 24,
  scale: 4,
  offsetX: 1,
  offsetY: 3,
});
assert.deepEqual(await loadLocalTileRange(), { minimum: 1, maximum: 6 });
assert.deepEqual(await loadLocalTileRange(null), { minimum: 1, maximum: 6 });
assert.deepEqual(await loadLocalTileRange(async () => ({ ok: false })), {
  minimum: 1,
  maximum: 6,
});
assert.deepEqual(
  await loadLocalTileRange(async () => ({
    ok: true,
    json: async () => ({ zoom: { minimum: 'low', maximum: 6 } }),
  })),
  { minimum: 1, maximum: 6 },
);
assert.deepEqual(
  await loadLocalTileRange(async () => ({
    ok: true,
    json: async () => ({ zoom: { minimum: 2, maximum: 8 } }),
  })),
  { minimum: 2, maximum: 8 },
);

const documentDescriptor = Object.getOwnPropertyDescriptor(
  globalThis,
  'document',
);
Object.defineProperty(globalThis, 'document', {
  configurable: true,
  value: {
    createElement(tag) {
      const listeners = {};
      return {
        tag,
        style: {},
        children: [],
        classList: {
          values: new Set(),
          add(value) {
            this.values.add(value);
          },
        },
        addEventListener(name, handler) {
          listeners[name] = handler;
        },
        appendChild(child) {
          this.children.push(child);
        },
        dispatch(name) {
          listeners[name]();
        },
      };
    },
  },
});
let loaded = 0;
let unavailable = 0;
const fallbackElement = createFallbackTile({
  template: '/maps/tiles/{z}/{x}/{y}.svg',
  tile: { zoom: 8, x: 73, y: 99 },
  minimumSourceZoom: 5,
  maximumSourceZoom: 6,
  onLoad: () => (loaded += 1),
  onUnavailable: () => (unavailable += 1),
});
const fallbackImage = fallbackElement.children[0];
assert.equal(fallbackImage.src, '/maps/tiles/6/18/24.svg');
assert.equal(fallbackImage.style.width, '1024px');
assert.equal(fallbackImage.style.left, '-256px');
fallbackImage.dispatch('load');
assert.equal(fallbackElement.classList.values.has('is-loaded'), true);
assert.equal(loaded, 1);
fallbackImage.dispatch('error');
assert.equal(fallbackImage.src, '/maps/tiles/5/9/12.svg');
fallbackImage.dispatch('error');
assert.equal(fallbackElement.classList.values.has('is-missing'), true);
assert.equal(unavailable, 1);

const renderedTiles = new Map();
const renderedChildren = [];
const renderedLayer = {
  classList: { contains: () => false },
  slippyPendingTiles: new Set(['6:18:24']),
  appendChild: (element) => renderedChildren.push(element),
};
const renderOptions = {
  tiles: renderedTiles,
  key: '6:18:24',
  layer: renderedLayer,
  template: '/maps/tiles/{z}/{x}/{y}.svg',
  tile: { zoom: 6, x: 18, y: 24 },
  minimumSourceZoom: 1,
  maximumSourceZoom: 6,
  origin: { x: 4500, y: 6100 },
};
const renderedTile = renderTile(renderOptions);
assert.equal(renderedChildren.length, 1);
assert.equal(renderedTile.style.left, '108px');
assert.equal(renderedTile.style.top, '44px');
renderedTile.children[0].dispatch('load');
assert.equal(renderedLayer.slippyPendingTiles.size, 0);
assert.equal(renderTile(renderOptions), renderedTile);
assert.equal(renderedChildren.length, 1);
renderOptions.origin = { x: 4500.25, y: 6100.5 };
renderTile(renderOptions);
assert.equal(renderedTile.style.left, '107.75px');
assert.equal(renderedTile.style.top, '43.5px');
const defaultLoadTile = createFallbackTile({
  template: '/maps/tiles/{z}/{x}/{y}.svg',
  tile: { zoom: 1, x: 0, y: 0 },
  minimumSourceZoom: 1,
  maximumSourceZoom: 1,
});
defaultLoadTile.children[0].dispatch('load');
defaultLoadTile.children[0].dispatch('error');
Object.defineProperty(
  globalThis,
  'document',
  documentDescriptor || { configurable: true, value: undefined },
);

console.log('Slippy map tile fallback tests passed.');
