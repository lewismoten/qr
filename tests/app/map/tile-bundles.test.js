import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createTileBundleResolver } from '../../../src/js/app/ui/content/geo/data/tile-bundles.js';

test('resolves configured zoom levels to bundle cells', () => {
  const resolveBundle = createTileBundleResolver({
    tileBundles: {
      template: '/bundles/{z}/{x}/{y}.svg',
      levels: { 6: 2, 7: 4, invalid: 4, 8: 1 },
    },
  });
  assert.deepEqual(resolveBundle({ zoom: 7, x: 18, y: 24 }), {
    url: '/bundles/7/4/6.svg',
    size: 4,
    offsetX: 2,
    offsetY: 0,
  });
  assert.deepEqual(resolveBundle({ zoom: 6, x: 9, y: 13 }), {
    url: '/bundles/6/4/6.svg',
    size: 2,
    offsetX: 1,
    offsetY: 1,
  });
  assert.equal(resolveBundle({ zoom: 5, x: 4, y: 5 }), null);
});

test('rejects absent and empty bundle configurations', () => {
  assert.equal(createTileBundleResolver({}), null);
  assert.equal(
    createTileBundleResolver({ tileBundles: { template: 4, levels: {} } }),
    null,
  );
  assert.equal(
    createTileBundleResolver({
      tileBundles: { template: '/tiles/{z}', levels: { 7: 1 } },
    }),
    null,
  );
});
