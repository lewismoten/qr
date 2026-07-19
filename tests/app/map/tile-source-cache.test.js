import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createTileSourceCache } from '../../../src/js/app/ui/content/geo/data/tile-source-cache.js';

function createHarness(options = {}) {
  const requests = [];
  const revoked = [];
  const cache = createTileSourceCache({
    fetcher: async (url) => {
      requests.push(url);
      return {
        ok: url !== 'missing',
        blob: async () => ({ size: url.length }),
      };
    },
    createUrl: (_blob) => `blob:${requests.at(-1)}`,
    revokeUrl: (url) => revoked.push(url),
    ...options,
  });
  return { cache, requests, revoked };
}

test('deduplicates tile requests and refreshes recent entries', async () => {
  const { cache, requests, revoked } = createHarness({ maximumEntries: 2 });
  const first = cache.resolve('one');
  assert.equal(await cache.resolve('one'), await first);
  await cache.resolve('two');
  await cache.resolve('one');
  await cache.resolve('three');

  assert.deepEqual(requests, ['one', 'two', 'three']);
  assert.deepEqual(revoked, ['blob:two']);
  assert.equal(cache.size, 2);
  assert.equal(cache.bytes, 8);
  cache.clear();
  assert.equal(cache.size, 0);
  assert.equal(cache.bytes, 0);
  assert.deepEqual(revoked, ['blob:two', 'blob:one', 'blob:three']);
});

test('evicts by byte size and permits failed requests to retry', async () => {
  const { cache, requests, revoked } = createHarness({ maximumBytes: 5 });
  await cache.resolve('four');
  await cache.resolve('xx');
  assert.deepEqual(revoked, ['blob:four']);
  await assert.rejects(cache.resolve('missing'), /Tile request failed/);
  await assert.rejects(cache.resolve('missing'), /Tile request failed/);
  assert.equal(requests.filter((url) => url === 'missing').length, 2);
});

test('uses direct URLs when fetch is unavailable', async () => {
  const cache = createTileSourceCache({ fetcher: null });
  assert.equal(await cache.resolve('/tile.svg'), '/tile.svg');
  cache.clear();
});

test('retains one tile when it alone exceeds the byte limit', async () => {
  const { cache, revoked } = createHarness({ maximumBytes: 1 });
  assert.equal(await cache.resolve('large'), 'blob:large');
  assert.equal(cache.size, 1);
  assert.deepEqual(revoked, []);
});

test('creates and revokes browser object URLs by default', async () => {
  const cache = createTileSourceCache({
    fetcher: async () => ({
      ok: true,
      blob: async () => new Blob(['<svg/>'], { type: 'image/svg+xml' }),
    }),
  });
  const url = await cache.resolve('/tile.svg');
  assert.match(url, /^blob:/);
  cache.clear();
});
