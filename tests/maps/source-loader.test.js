import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { obtainMapSource } from '../../scripts/maps/source-loader.mjs';

const response = (body) =>
  new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json' },
  });

test('downloads ArcGIS object ID pages without deep offsets', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'qr-map-source-'));
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url, options) => {
    requests.push(url);
    if (url.endsWith('/ids')) return response({ objectIds: [10, 20, 30] });
    const ids = new URLSearchParams(options.body).get('objectIds').split(',');
    return response({
      type: 'FeatureCollection',
      features: ids.map((id) => ({
        type: 'Feature',
        id: Number(id),
        properties: {},
        geometry: { type: 'Point', coordinates: [0, 0] },
      })),
    });
  };
  try {
    const source = {
      file: 'sample.geojson',
      url: 'https://example.test/query?f=geojson',
      idsUrl: 'https://example.test/ids',
      objectIdPagination: true,
      parallelPages: 2,
      pageSize: 2,
    };
    await obtainMapSource({
      name: 'sample',
      source,
      cache: root,
      formatBytes: (bytes) => `${bytes} B`,
    });
    const saved = JSON.parse(await readFile(path.join(root, source.file)));
    assert.deepEqual(
      saved.features.map(({ id }) => id),
      [10, 20, 30],
    );
    assert.equal(
      requests.some((url) => url.includes('resultOffset')),
      false,
    );
    assert.equal(requests.filter((url) => url.includes('/query')).length, 2);
  } finally {
    globalThis.fetch = originalFetch;
    await rm(root, { recursive: true, force: true });
  }
});
