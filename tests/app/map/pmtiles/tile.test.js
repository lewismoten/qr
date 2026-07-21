import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createPmtilesTile } from '../../../../src/js/app/ui/content/geo/pmtiles/tile.js';

class ClassList {
  values = new Set();

  add(...names) {
    names.forEach((name) => this.values.add(name));
  }

  contains(name) {
    return this.values.has(name);
  }

  toggle(name, force) {
    if (force) this.values.add(name);
    else this.values.delete(name);
  }
}

function element(tag) {
  return {
    tag,
    children: [],
    classList: new ClassList(),
    dataset: {},
    append(child) {
      this.children.push(child);
    },
    getContext: () => ({ clearRect() {} }),
  };
}

async function withDocument(callback) {
  const original = globalThis.document;
  globalThis.document = { createElement: element };
  try {
    await callback();
  } finally {
    globalThis.document = original;
  }
}

test('creates a loaded PMTiles element for an exact vector tile', async () => {
  await withDocument(async () => {
    const events = [];
    const tile = createPmtilesTile({
      source: { getTile: async () => new Uint8Array() },
      tile: { zoom: 8, x: 2, y: 3 },
      minimumSourceZoom: 1,
      maximumSourceZoom: 8,
      onLoad: () => events.push('loaded'),
      onSourceChange: (zoom) => events.push(zoom),
    });
    await tile.slippyReady;
    assert.equal(tile.classList.contains('is-loaded'), true);
    assert.equal(tile.classList.contains('is-fallback'), false);
    assert.equal(tile.slippySourceZoom, 8);
    assert.deepEqual(events, [8, 'loaded']);
  });
});

test('composites parent and background PMTiles levels', async () => {
  await withDocument(async () => {
    const requests = [];
    const tile = createPmtilesTile({
      source: {
        async getTile(zoom, x, y) {
          requests.push(`${zoom}/${x}/${y}`);
          return new Uint8Array();
        },
      },
      tile: { zoom: 17, x: 20, y: 30 },
      minimumSourceZoom: 1,
      maximumSourceZoom: 17,
    });
    await tile.slippyReady;
    assert.equal(tile.classList.contains('is-loaded'), true);
    assert.equal(
      requests.some((value) => value.startsWith('10/')),
      true,
    );
    assert.equal(
      requests.some((value) => value.startsWith('16/')),
      true,
    );
  });
});

test('marks fallback and unavailable PMTiles elements', async () => {
  await withDocument(async () => {
    const changes = [];
    const fallback = createPmtilesTile({
      source: {
        getTile: async (zoom) => (zoom === 12 ? new Uint8Array() : null),
      },
      tile: { zoom: 13, x: 20, y: 30 },
      minimumSourceZoom: 12,
      maximumSourceZoom: 13,
      onSourceChange: (zoom) => changes.push(zoom),
    });
    await fallback.slippyReady;
    assert.equal(fallback.classList.contains('is-fallback'), true);
    assert.equal(fallback.slippySourceZoom, 12);
    assert.deepEqual(changes, [12]);

    let unavailable = 0;
    const missing = createPmtilesTile({
      source: { getTile: async () => null },
      tile: { zoom: 2, x: 0, y: 0 },
      minimumSourceZoom: 1,
      maximumSourceZoom: 2,
      onUnavailable: () => {
        unavailable += 1;
      },
    });
    await missing.slippyReady;
    assert.equal(missing.slippyStatusSourceZoom, -1);
    assert.equal(unavailable, 1);

    const failed = createPmtilesTile({
      source: {
        getTile: async () => {
          throw new Error('network');
        },
      },
      tile: { zoom: 1, x: 0, y: 0 },
      minimumSourceZoom: 1,
      maximumSourceZoom: 1,
      onUnavailable: () => {
        unavailable += 1;
      },
    });
    await failed.slippyReady;
    assert.equal(unavailable, 2);
  });
});
