import assert from 'node:assert/strict';
import test from 'node:test';

import { runTippecanoe } from '../../../scripts/maps/vector/runner.mjs';

test('identifies Tippecanoe no-data exits', async () => {
  await assert.rejects(
    () =>
      runTippecanoe({
        executable: process.execPath,
        args: ['-e', 'process.exit(110)'],
        temporary: '/tmp/nonexistent-tippecanoe-output.pmtiles',
        workingLimit: Number.MAX_SAFE_INTEGER,
        zoom: 'z12 g16-x2-y7',
        threads: 1,
      }),
    (error) => {
      assert.equal(error.exitCode, 110);
      assert.equal(error.noData, true);
      assert.match(error.message, /no visible data/);
      return true;
    },
  );
});
