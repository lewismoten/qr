import assert from 'node:assert/strict';
import test from 'node:test';

import { buildArchiveSchedule } from '../../../scripts/maps/vector/scheduling/archive-scheduler.mjs';

function levels(count = 4) {
  return Array.from({ length: count }, (_, index) => ({
    minimumZoom: 13,
    budgetBytes: 100,
    shard: `shard-${index}`,
  }));
}

test('builds same-zoom archives in bounded parallel waves', async () => {
  let active = 0;
  let peak = 0;
  const allocations = [];
  const completed = [];
  const results = await buildArchiveSchedule({
    levels: levels(),
    jobs: 2,
    minimumLevelBytes: 10,
    async build(level, allocatedBudgetBytes) {
      active += 1;
      peak = Math.max(peak, active);
      allocations.push(allocatedBudgetBytes);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
      const early = level.shard.endsWith('0') || level.shard.endsWith('1');
      return {
        ...level,
        allocatedBudgetBytes,
        bytes: early ? 50 : 120,
      };
    },
    onComplete(result) {
      completed.push(result.shard);
    },
  });

  assert.equal(peak, 2);
  assert.deepEqual(allocations, [100, 100, 150, 150]);
  assert.deepEqual(
    results.map((result) => result.carryBytes),
    [50, 100, 80, 60],
  );
  assert.deepEqual(
    completed,
    levels().map((level) => level.shard),
  );
});

test('waits for a failed wave and rejects invalid concurrency', async () => {
  let finished = false;
  await assert.rejects(
    () =>
      buildArchiveSchedule({
        levels: levels(2),
        jobs: 2,
        minimumLevelBytes: 10,
        async build(level) {
          if (level.shard.endsWith('0')) throw new Error('failed');
          await new Promise((resolve) => setTimeout(resolve, 5));
          finished = true;
          return { ...level, bytes: 100 };
        },
      }),
    /failed/,
  );
  assert.equal(finished, true);
  await assert.rejects(
    () =>
      buildArchiveSchedule({
        levels: [],
        jobs: 0,
        minimumLevelBytes: 10,
        build() {},
      }),
    /positive integer/,
  );
});
