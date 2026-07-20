import { mkdir, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import {
  readVectorBuildOptions,
  VECTOR_BUILD_HELP,
} from '../reporting/options.mjs';
import {
  createBuildLog,
  recordArchiveAttempt,
  recordCompletedArchive,
  recordZoomPlan,
} from '../reporting/run-log.mjs';
import { prepareVectorInputs, validateVectorLayers } from './prepare.mjs';
import {
  archiveCandidate,
  finalizeArchiveQuality,
} from './lifecycle/archive-quality.mjs';
import {
  archiveReductionWarning,
  compactBuildSettings,
  formatTileLimit,
  planArchiveLevels,
} from './budget.mjs';
import { buildArchiveSchedule } from './scheduling/archive-scheduler.mjs';
import { createLevelPlanner } from './scheduling/level-planner.mjs';
import { tippecanoeArguments } from './command.mjs';
import {
  readPmtilesArchiveStats as readArchiveStats,
  smallestArchivePath,
  temporaryArchivePath,
  validatePmtilesArchive,
} from './output.mjs';
import { runTippecanoe, validateTippecanoeExecutable } from './runner.mjs';
import { levelShardLabel } from './shards.mjs';
import { finalizeArchiveSet } from './lifecycle/archive-set.mjs';
const options = readVectorBuildOptions();
const {
  values,
  cache,
  input,
  output,
  minimumZoom,
  maximumZoom,
  baseZoom,
  maximumTileBytes,
  maximumWorkingBytes,
  maximumArchiveBytes,
  detail,
  budgetGrowth,
  minimumLevelBytes,
  shardZoom,
  shardTargetBytes,
  jobs,
  executable,
} = options;
if (values.includes('--help')) {
  console.log(VECTOR_BUILD_HELP);
  process.exit(0);
}
const log = createBuildLog(options);
console.log(`Generation log: ${log.file}`);
validateTippecanoeExecutable(executable);
validateVectorLayers();
await mkdir(path.dirname(output), { recursive: true });
const preparationStarted = Date.now();
const inputs = await prepareVectorInputs({ cache, output: input });
for (const item of inputs) {
  console.log(`  ${item.layer}: ${item.features.toLocaleString()} features`);
}
log.record('inputs-prepared', {
  durationMs: Date.now() - preparationStarted,
  layers: inputs,
});
const levels = planArchiveLevels({
  minimumZoom,
  maximumZoom,
  maximumArchiveBytes,
  output,
  growth: budgetGrowth,
  minimumLevelBytes,
});
async function runLevel(level, settings) {
  const temporary = temporaryArchivePath(level.file);
  await rm(temporary, { force: true });
  const args = tippecanoeArguments({
    inputs,
    output: temporary,
    minimumZoom: level.minimumZoom,
    maximumZoom: level.maximumZoom,
    baseZoom,
    clipBoundingBox: level.bounds,
    ...settings,
  });
  const run = await runTippecanoe({
    executable,
    args,
    temporary,
    workingLimit: maximumWorkingBytes,
    zoom: levelShardLabel(level),
    log,
    context: {
      zoom: level.minimumZoom,
      shard: level.shard,
      maximumTileBytes: settings.maximumTileBytes,
      configuredDetail: settings.detail,
    },
  });
  return { temporary, ...run };
}
async function buildLevel(level, allocatedBudgetBytes) {
  const allocation = { ...level, budgetBytes: allocatedBudgetBytes };
  const smallestFile = smallestArchivePath(level.file);
  await rm(smallestFile, { force: true });
  let best = null;
  let naturalBytes = null;
  let naturalArchiveStats = null;
  let settings = { maximumTileBytes, detail };
  const acceptSmallest = () => {
    const debt = (best.bytes - allocatedBudgetBytes) / 1024 / 1024;
    console.warn(
      `${levelShardLabel(level)} reached its compaction limit; ` +
        `carrying ${debt.toFixed(1)} MiB debt.`,
    );
    return finalizeArchiveQuality(level, best);
  };
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const attemptStarted = Date.now();
    const tileLimit = formatTileLimit(settings.maximumTileBytes);
    console.log(
      `Building ${levelShardLabel(level)}, attempt ${attempt}, ` +
        `${(allocatedBudgetBytes / 1024 / 1024).toFixed(1)} MiB ` +
        'budget, ' +
        `${tileLimit}...`,
    );
    recordArchiveAttempt(log, 'archive-attempt-start', {
      level,
      attempt,
      allocatedBudgetBytes,
      settings,
    });
    let result;
    let recovery = false;
    try {
      result = await runLevel(allocation, settings);
    } catch (error) {
      const recoverable = error.exitCode === 100 || error.workingLimitExceeded;
      if (recoverable && best) {
        await rm(temporaryArchivePath(level.file), { force: true });
        return acceptSmallest();
      }
      if (error.exitCode !== 100) throw error;
      console.warn(
        `${levelShardLabel(level)} cannot satisfy the tile ceiling; ` +
          'building its smallest viable archive.',
      );
      settings = { ...settings, maximumTileBytes: null };
      result = await runLevel(allocation, settings);
      recovery = true;
    }
    let bytes;
    let archiveStats;
    try {
      bytes = await validatePmtilesArchive(
        result.temporary,
        Number.MAX_SAFE_INTEGER,
      );
      archiveStats = await readArchiveStats(result.temporary, maximumTileBytes);
    } catch (error) {
      await rm(result.temporary, { force: true });
      if (!best) throw error;
      console.warn(
        `${levelShardLabel(level)} produced an incomplete retry; ` +
          'restoring its last valid archive.',
      );
      return acceptSmallest();
    }
    naturalBytes ??= bytes;
    naturalArchiveStats ??= archiveStats;
    recordArchiveAttempt(log, 'archive-attempt-complete', {
      level,
      attempt,
      allocatedBudgetBytes,
      settings,
      durationMs: Date.now() - attemptStarted,
      bytes,
      archiveStats,
      naturalBytes,
      retainedRatio: bytes / naturalBytes,
      recovery,
      fitSummary: result.fitSummary,
    });
    if (bytes <= allocatedBudgetBytes) {
      await rm(smallestFile, { force: true });
      return finalizeArchiveQuality(
        level,
        archiveCandidate({
          level,
          settings,
          allocatedBudgetBytes,
          bytes,
          archiveStats,
          naturalBytes,
          naturalArchiveStats,
          temporary: result.temporary,
        }),
      );
    }
    const previousBytes = best?.bytes;
    const warning = archiveReductionWarning(
      levelShardLabel(level),
      previousBytes,
      bytes,
    );
    if (warning) {
      await rm(result.temporary, { force: true });
      console.warn(warning);
      return acceptSmallest();
    }
    if (!best || bytes < best.bytes) {
      await rm(smallestFile, { force: true });
      await rename(result.temporary, smallestFile);
      best = archiveCandidate({
        level,
        settings,
        allocatedBudgetBytes,
        bytes,
        archiveStats,
        naturalBytes,
        naturalArchiveStats,
        temporary: smallestFile,
      });
    } else {
      await rm(result.temporary, { force: true });
    }
    if (recovery || result.fitSummary?.featureGapLimitReached) {
      return acceptSmallest();
    }
    const next = compactBuildSettings({
      ...settings,
      budgetBytes: allocatedBudgetBytes,
      observedBytes: bytes,
      attempt,
    });
    const smallest =
      attempt === 5 ||
      (next.maximumTileBytes === settings.maximumTileBytes &&
        next.detail === settings.detail);
    if (smallest) {
      return acceptSmallest();
    }
    settings = next;
  }
  throw new Error(`Unable to build ${levelShardLabel(level)}.`);
}
const temporaryFiles = new Set();
const planLevel = createLevelPlanner({
  inputs,
  shardZoom,
  shardTargetBytes,
  shardVariancePercent: options.shardVariancePercent,
});
try {
  const results = await buildArchiveSchedule({
    levels,
    jobs,
    maximumDebtBytes: options.maximumDebtBytes,
    minimumLevelBytes,
    build: buildLevel,
    planLevel,
    onPlan(plannedLevels) {
      recordZoomPlan(log, plannedLevels, shardTargetBytes);
      for (const level of plannedLevels) {
        temporaryFiles.add(temporaryArchivePath(level.file));
        temporaryFiles.add(smallestArchivePath(level.file));
      }
    },
    onComplete(result, durationMs) {
      recordCompletedArchive(log, result, durationMs);
    },
  });
  await finalizeArchiveSet({
    results,
    output,
    minimumZoom,
    maximumZoom,
    maximumArchiveMiB: options.maximumArchiveMiB,
    maximumArchiveBytes,
    log,
  });
  log.close();
} catch (error) {
  await Promise.all(
    [...temporaryFiles].map((file) => rm(file, { force: true })),
  );
  log.recordError('run-error', error, {
    durationMs: Date.now() - log.startedAt,
  });
  log.close();
  throw error;
}
