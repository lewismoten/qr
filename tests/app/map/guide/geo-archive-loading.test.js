import assert from 'node:assert/strict';

import { loadGeoArchive } from '../../../../src/js/info/geo-layer-samples.js';

const header = { minimumZoom: 1, maximumZoom: 19 };
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
