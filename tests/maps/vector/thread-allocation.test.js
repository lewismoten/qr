import assert from 'node:assert/strict';
import test from 'node:test';

import { allocateTippecanoeThreads } from '../../../scripts/maps/vector/scheduling/thread-allocation.mjs';

test('shares available threads across the active archive workload', () => {
  const dynamic = (archiveCount, concurrentJobs) =>
    allocateTippecanoeThreads({
      archiveCount,
      concurrentJobs,
      configuredThreads: 2,
      dynamic: true,
      availableThreads: 8,
    });

  assert.equal(dynamic(1, 1), 8);
  assert.equal(dynamic(2, 2), 4);
  assert.equal(dynamic(8, 4), 2);
  assert.equal(
    allocateTippecanoeThreads({
      archiveCount: 1,
      concurrentJobs: 1,
      configuredThreads: 3,
      dynamic: false,
      availableThreads: 8,
    }),
    3,
  );
});
