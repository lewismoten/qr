import assert from 'node:assert/strict';

import {
  FRONT_ROYAL,
  getCenteredTileLayout,
} from '../../../../src/js/info/geo-layer-layout.js';
import {
  initializeGeoLayerSamples,
  loadGeoArchive,
  renderGeoLayerSample,
  revealFallbackSamples,
  startGeoLayerSamples,
} from '../../../../src/js/info/geo-layer-samples.js';

const level = getCenteredTileLayout(13);
assert.deepEqual(level.centerTile, {
  zoom: 13,
  x: 2316,
  y: 3133,
});
assert.equal(level.tiles.length, 4);
assert.equal(level.tiles.filter(({ isCenter }) => isCenter).length, 1);

const center = level.tiles.find(({ isCenter }) => isCenter);
assert.ok(center.left <= 50 && center.left + 100 >= 50);
assert.ok(center.top <= 50 && center.top + 100 >= 50);

const bounds = level.tiles.reduce(
  (result, item) => ({
    bottom: Math.max(result.bottom, item.top + 100),
    left: Math.min(result.left, item.left),
    right: Math.max(result.right, item.left + 100),
    top: Math.min(result.top, item.top),
  }),
  { bottom: -Infinity, left: Infinity, right: -Infinity, top: Infinity },
);
assert.ok(bounds.left <= 0 && bounds.right >= 100);
assert.ok(bounds.top <= 0 && bounds.bottom >= 100);

assert.deepEqual(FRONT_ROYAL, {
  latitude: 38.9182,
  longitude: -78.1944,
});

const removed = [];
const image = {
  dataset: { fallbackSrc: '/maps/tiles/1/0/0.svg' },
  removeAttribute(name) {
    removed.push(name);
  },
};
revealFallbackSamples({
  querySelectorAll: () => [image],
});
assert.equal(image.src, '/maps/tiles/1/0/0.svg');
assert.deepEqual(removed, ['data-fallback-src']);

function sample(zoom) {
  return {
    closest: () => ({ cells: [{ textContent: String(zoom) }] }),
  };
}

function sampleRoot(samples, fallbacks = []) {
  return {
    querySelectorAll(selector) {
      if (selector === '[data-centered-map-samples]') {
        return [{ querySelectorAll: () => samples }];
      }
      if (selector === 'img[data-fallback-src]') return fallbacks;
      return [];
    },
  };
}

const header = { minimumZoom: 1, maximumZoom: 19 };
const source = {};
const eagerSamples = [sample(4), sample('invalid')];
const eagerRenders = [];
await initializeGeoLayerSamples(sampleRoot(eagerSamples), {
  getArchive: async () => ({ header, source }),
  render: async (...values) => eagerRenders.push(values),
  search: '?handbook-source=1',
});
assert.equal(eagerRenders.length, 1);
assert.deepEqual(eagerRenders[0], [eagerSamples[0], 4, source, header]);

const immediateSample = sample(5);
let immediateRenders = 0;
await initializeGeoLayerSamples(sampleRoot([immediateSample]), {
  getArchive: async () => ({ header, source }),
  render: () => {
    immediateRenders += 1;
  },
  Observer: null,
  search: '',
});
assert.equal(immediateRenders, 1);

const observedSample = sample(6);
let observer;
let observedRenders = 0;
class Observer {
  constructor(callback, options) {
    this.callback = callback;
    this.options = options;
    this.observed = [];
    this.unobserved = [];
    observer = this;
  }

  observe(value) {
    this.observed.push(value);
  }

  unobserve(value) {
    this.unobserved.push(value);
  }
}
await initializeGeoLayerSamples(sampleRoot([observedSample]), {
  getArchive: async () => ({ header, source }),
  render: () => {
    observedRenders += 1;
  },
  Observer,
  search: '',
});
assert.deepEqual(observer.options, { rootMargin: '200px' });
assert.deepEqual(observer.observed, [observedSample]);
observer.callback([
  { isIntersecting: false, target: observedSample },
  { isIntersecting: true, target: observedSample },
]);
assert.equal(observedRenders, 1);
assert.deepEqual(observer.unobserved, [observedSample]);

const failedSample = sample(7);
const fallback = {
  dataset: { fallbackSrc: '/fallback.svg' },
  removeAttribute() {},
};
await assert.rejects(
  () =>
    initializeGeoLayerSamples(sampleRoot([failedSample], [fallback]), {
      getArchive: async () => {
        throw new Error('offline');
      },
      search: '',
    }),
  /offline/,
);
assert.equal(fallback.src, '/fallback.svg');
let retries = 0;
await initializeGeoLayerSamples(sampleRoot([failedSample]), {
  getArchive: async () => ({ header, source }),
  render: () => {
    retries += 1;
  },
  Observer: null,
  search: '',
});
assert.equal(retries, 1);

await initializeGeoLayerSamples(sampleRoot([]), {
  getArchive: async () => {
    throw new Error('should not load');
  },
});
await initializeGeoLayerSamples(
  {},
  {
    getArchive: async () => {
      throw new Error('should not load');
    },
  },
);
assert.equal(startGeoLayerSamples(null), null);
await startGeoLayerSamples(sampleRoot([]), '?handbook-source=1');
assert.ok(globalThis.handbookPageReady instanceof Promise);

const originalDocument = globalThis.document;
globalThis.document = {
  createElement() {
    return {
      children: [],
      style: {},
      append(child) {
        this.children.push(child);
      },
      setAttribute(name, value) {
        this[name] = value;
      },
    };
  },
};
try {
  const caption = { textContent: '' };
  const classes = [];
  const prepended = [];
  const renderedSample = {
    classList: { add: (value) => classes.push(value) },
    prepend: (value) => prepended.push(value),
    querySelector: () => caption,
  };
  const requests = [];
  await renderGeoLayerSample(renderedSample, 4, source, header, {
    getLayout: () => ({
      centerTile: { zoom: 4, x: 2, y: 3 },
      tiles: [
        {
          isCenter: true,
          left: 0,
          top: 0,
          tile: { zoom: 4, x: 2, y: 3 },
        },
      ],
    }),
    createTile(options) {
      options.onLoad();
      options.onSourceChange(4);
      options.onSourceChange(3);
      const tile = { style: {}, slippyReady: Promise.resolve() };
      requests.push(options);
      return tile;
    },
  });
  assert.deepEqual(classes, ['has-centered-map']);
  assert.equal(caption.textContent, 'L4 → L3 · 1/1');
  assert.equal(prepended.length, 1);
  assert.equal(prepended[0].children.length, 2);
  assert.equal(requests[0].minimumSourceZoom, 1);
} finally {
  globalThis.document = originalDocument;
}

let archiveAttempts = 0;
const fallbackSource = { getHeader: async () => header };
assert.deepEqual(
  await loadGeoArchive({
    archiveFactory: async () => {
      archiveAttempts += 1;
      throw new Error('manifest missing');
    },
    sourceFactory: () => fallbackSource,
  }),
  { header, source: fallbackSource },
);
await loadGeoArchive({
  archiveFactory: async () => {
    archiveAttempts += 1;
    return fallbackSource;
  },
});
assert.equal(archiveAttempts, 1);
