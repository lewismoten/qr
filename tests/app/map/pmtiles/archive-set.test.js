import assert from 'node:assert/strict';
import test from 'node:test';

import { createPmtilesArchiveSet } from '../../../../src/js/app/ui/content/geo/pmtiles/archive-set.js';

test('routes zooms across a budgeted PMTiles archive set', async () => {
  const requests = [];
  const manifest = {
    version: 1,
    minimumZoom: 1,
    maximumZoom: 17,
    archives: [
      { minimumZoom: 1, maximumZoom: 8, file: 'low.pmtiles' },
      { minimumZoom: 9, maximumZoom: 17, file: 'high.pmtiles' },
    ],
  };
  const source = await createPmtilesArchiveSet('/maps/local.json', {
    fetcher: async () => new Response(JSON.stringify(manifest)),
    sourceFactory: (url) => ({
      async getTile(zoom) {
        requests.push(`${url}:${zoom}`);
        return new Uint8Array([zoom]);
      },
    }),
  });
  assert.deepEqual(await source.getHeader(), {
    minimumZoom: 1,
    maximumZoom: 17,
  });
  assert.deepEqual(await source.getTile(7, 0, 0), new Uint8Array([7]));
  assert.deepEqual(await source.getTile(13, 0, 0), new Uint8Array([13]));
  assert.deepEqual(requests, [
    'http://localhost/maps/low.pmtiles:7',
    'http://localhost/maps/high.pmtiles:13',
  ]);
});
