import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createWorldMap } from '../../../../src/js/app/ui/content/geo/world-map.js';

function fixture() {
  const handlers = {};
  const elements = {
    '.geo-world-surface': { hidden: false },
    '.geo-world-overlay': { hidden: false },
    '#geo-world-marker': { hidden: true, setAttribute() {} },
    '#geo-world-label': { hidden: true, style: {}, textContent: '' },
    '#geo-world-zoom-controls': { hidden: false },
    '#geo-world-zoom-in': {
      addEventListener(_name, handler) {
        handlers.zoom = handler;
      },
    },
    '#geo-world-attribution': { hidden: false },
    '#geo-local-map': { hidden: true },
  };
  const container = {
    addEventListener(name, handler) {
      handlers[name] = handler;
    },
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 50 }),
    querySelector: (selector) => elements[selector],
  };
  return { container, elements, handlers };
}

function slippyLoader(calls) {
  return async () => ({
    createSlippyMap(_element, options) {
      calls.push(options);
      return {
        getView: () => ({ center: options.center, zoom: options.zoom }),
        setMarker() {},
        setView() {},
      };
    },
  });
}

test('falls back from a PMTiles manifest to one archive', async () => {
  const { container, handlers } = fixture();
  const calls = [];
  const source = {
    getHeader: async () => ({ minimumZoom: 2, maximumZoom: 15 }),
  };
  const map = createWorldMap(container, {
    loadSlippyMap: slippyLoader(calls),
    loadPmtiles: async () => ({
      createPmtilesArchiveSet: async () => {
        throw new Error('manifest missing');
      },
      createPmtilesSource: () => source,
      createPmtilesTile() {},
    }),
    loadTileRange: async () => {
      throw new Error('legacy range should not load');
    },
  });
  handlers.zoom();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(calls[0].minSourceZoom, 2);
  assert.equal(calls[0].maxSourceZoom, 15);
  assert.equal(typeof calls[0].tileFactory, 'function');
  calls[0].tileFactory({ tile: {} });
  await map.showDetail();
  assert.equal(calls.length, 1);
});

test('uses SVG ranges when vector archives are unavailable', async () => {
  const { container, handlers } = fixture();
  const calls = [];
  let rangeLoads = 0;
  createWorldMap(container, {
    loadSlippyMap: slippyLoader(calls),
    loadPmtiles: async () => ({
      createPmtilesArchiveSet: async () => {
        throw new Error('manifest missing');
      },
      createPmtilesSource: () => ({
        getHeader: async () => {
          throw new Error('archive missing');
        },
      }),
    }),
    loadTileRange: async () => {
      rangeLoads += 1;
      return {
        minimum: 3,
        maximum: 8,
        hasTile() {},
        getTileBundle() {},
      };
    },
  });
  handlers.zoom();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(rangeLoads, 1);
  assert.equal(calls[0].minSourceZoom, 3);
  assert.equal(typeof calls[0].hasSourceTile, 'function');
  assert.equal(typeof calls[0].getTileBundle, 'function');
  assert.equal(calls[0].tileFactory, undefined);
});

test('supports no PMTiles module and no selection callback', async () => {
  const { container, handlers } = fixture();
  const calls = [];
  createWorldMap(container, {
    loadSlippyMap: slippyLoader(calls),
    loadTileRange: async () => ({ minimum: 1, maximum: 4 }),
  });
  assert.doesNotThrow(() => {
    handlers.click({ clientX: 50, clientY: 25 });
  });
  handlers.zoom();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(calls[0].maxSourceZoom, 4);
});
