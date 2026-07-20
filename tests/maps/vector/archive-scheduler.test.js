import assert from 'node:assert/strict';
import test from 'node:test';

import { buildArchiveSchedule } from '../../../scripts/maps/vector/scheduling/archive-scheduler.mjs';

function baseLevels(count = 2) {
  return Array.from({ length: count }, (_, index) => ({
    minimumZoom: 13 + index,
    budgetBytes: 200,
  }));
}

function planLevel(level) {
  return [0, 1].map((index) => ({
    ...level,
    budgetBytes: 100,
    shard: `${level.minimumZoom}-${index}`,
  }));
}

test('builds planned shards in bounded parallel waves', async () => {
  let active = 0;
  let peak = 0;
  const allocations = [];
  const completed = [];
  const priorCounts = [];
  const results = await buildArchiveSchedule({
    levels: baseLevels(),
    jobs: 2,
    minimumLevelBytes: 10,
    planLevel(level, previousResults) {
      priorCounts.push(previousResults.length);
      return planLevel(level);
    },
    async build(level, allocatedBudgetBytes) {
      active += 1;
      peak = Math.max(peak, active);
      allocations.push(allocatedBudgetBytes);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
      return {
        ...level,
        allocatedBudgetBytes,
        bytes: level.minimumZoom === 13 ? 50 : 120,
      };
    },
    onComplete(result) {
      completed.push(result.shard);
    },
  });

  assert.equal(peak, 2);
  assert.deepEqual(priorCounts, [0, 2]);
  assert.deepEqual(allocations, [100, 100, 150, 150]);
  assert.deepEqual(
    results.map((result) => result.carryBytes),
    [50, 100, 80, 60],
  );
  assert.deepEqual(completed, ['13-0', '13-1', '14-0', '14-1']);
});

test('waits for a failed wave and rejects invalid concurrency', async () => {
  let finished = false;
  await assert.rejects(
    () =>
      buildArchiveSchedule({
        levels: baseLevels(1),
        jobs: 2,
        minimumLevelBytes: 10,
        planLevel,
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
