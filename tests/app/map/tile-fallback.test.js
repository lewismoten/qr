import assert from 'node:assert/strict';

import {
  createFallbackTile,
  getFallbackTile,
  loadLocalTileRange,
} from '../../../src/js/app/ui/content/geo/tile-fallback.js';

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
const fallbackElement = createFallbackTile({
  template: '/maps/tiles/{z}/{x}/{y}.svg',
  tile: { zoom: 8, x: 73, y: 99 },
  minimumSourceZoom: 5,
  maximumSourceZoom: 6,
});
const fallbackImage = fallbackElement.children[0];
assert.equal(fallbackImage.src, '/maps/tiles/6/18/24.svg');
assert.equal(fallbackImage.style.width, '1024px');
assert.equal(fallbackImage.style.left, '-256px');
fallbackImage.dispatch('error');
assert.equal(fallbackImage.src, '/maps/tiles/5/9/12.svg');
fallbackImage.dispatch('error');
assert.equal(fallbackElement.classList.values.has('is-missing'), true);
Object.defineProperty(
  globalThis,
  'document',
  documentDescriptor || { configurable: true, value: undefined },
);

console.log('Slippy map tile fallback tests passed.');
