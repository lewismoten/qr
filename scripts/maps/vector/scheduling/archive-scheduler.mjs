import { availableLevelBudget, updateBudgetCarry } from '../budget.mjs';

function allocateWave(levels, carryBytes, minimumLevelBytes, maximumDebtBytes) {
  const surplus = Math.max(0, carryBytes);
  const debt = Math.max(0, -carryBytes);
  const variance = Math.max(0, maximumDebtBytes - debt);
  const headroom = surplus + variance;
  const planned = levels.reduce((sum, level) => sum + level.budgetBytes, 0);
  let distributed = 0;
  return levels.map((level, index) => {
    const final = index === levels.length - 1;
    const bonus = final
      ? headroom - distributed
      : Math.floor((headroom * level.budgetBytes) / planned);
    distributed += bonus;
    return availableLevelBudget({
      plannedBytes: level.budgetBytes + bonus,
      carryBytes: 0,
      minimumLevelBytes,
    });
  });
}

async function buildWave(levels, allocations, build) {
  const started = levels.map(() => Date.now());
  const settled = await Promise.allSettled(
    levels.map((level, index) => build(level, allocations[index])),
  );
  const failure = settled.find((result) => result.status === 'rejected');
  if (failure) throw failure.reason;
  return settled.map((result, index) => ({
    result: result.value,
    durationMs: Date.now() - started[index],
  }));
}

export async function buildArchiveSchedule({
  levels,
  jobs = 1,
  maximumDebtBytes = 0,
  minimumLevelBytes,
  build,
  onComplete,
  onPlan,
  planLevel = (level) => [level],
}) {
  if (!Number.isInteger(jobs) || jobs < 1) {
    throw new RangeError('Map build jobs must be a positive integer.');
  }
  const results = [];
  let earlierResults = [];
  let previousResults = [];
  let carryBytes = 0;
  for (const level of levels) {
    const group = planLevel(level, previousResults, earlierResults);
    onPlan?.(group);
    const levelResults = [];
    for (let offset = 0; offset < group.length; offset += jobs) {
      const wave = group.slice(offset, offset + jobs);
      const allocations = allocateWave(
        wave,
        carryBytes,
        minimumLevelBytes,
        maximumDebtBytes,
      );
      const built = await buildWave(wave, allocations, build);
      for (const { result, durationMs } of built) {
        carryBytes = updateBudgetCarry({
          carryBytes,
          plannedBytes: result.budgetBytes,
          actualBytes: result.bytes,
        });
        result.carryBytes = carryBytes;
        levelResults.push(result);
        if (!result.empty) results.push(result);
        onComplete?.(result, durationMs);
      }
    }
    earlierResults = previousResults;
    previousResults = levelResults;
  }
  return results;
}
