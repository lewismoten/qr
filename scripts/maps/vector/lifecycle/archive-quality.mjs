import { levelShardLabel } from '../shards.mjs';

export function archiveCandidate({
  level,
  settings,
  allocatedBudgetBytes,
  bytes,
  archiveStats,
  naturalBytes,
  naturalArchiveStats,
  temporary,
}) {
  return {
    ...level,
    ...settings,
    allocatedBudgetBytes,
    bytes,
    archiveStats,
    naturalBytes,
    naturalArchiveStats,
    temporary,
  };
}

export function emptyArchiveCandidate(level, allocatedBudgetBytes) {
  return {
    ...level,
    allocatedBudgetBytes,
    bytes: 0,
    naturalBytes: 0,
    empty: true,
  };
}

export function finalizeArchiveQuality(level, result) {
  const retainedRatio = result.bytes / result.naturalBytes;
  if (retainedRatio < 0.5) {
    console.warn(
      `${levelShardLabel(level)} retained only ` +
        `${(retainedRatio * 100).toFixed(1)}% of its natural size.`,
    );
  }
  return { ...result, retainedRatio };
}

export function archiveFitsSoftTarget(
  bytes,
  budgetBytes,
  shardTargetBytes,
  variancePercent,
) {
  const softTargetBytes = shardTargetBytes * (1 + variancePercent / 100);
  return bytes <= budgetBytes || bytes <= softTargetBytes;
}

export function tileLimitCannotBind(maximumBytes, archiveStats) {
  return maximumBytes >= archiveStats.actualLargestTileBytes;
}

export function warnForNonBindingTileLimit(level, maximumBytes, archiveStats) {
  if (!tileLimitCannotBind(maximumBytes, archiveStats)) return false;
  console.warn(
    `${levelShardLabel(level)} retry ceiling cannot affect its ` +
      'largest stored tile; accepting the current archive.',
  );
  return true;
}

export function acceptCompactedArchive(level, result, budgetBytes) {
  const debt = (result.bytes - budgetBytes) / 1024 / 1024;
  console.warn(
    `${levelShardLabel(level)} reached its compaction limit; ` +
      `carrying ${debt.toFixed(1)} MiB debt.`,
  );
  return finalizeArchiveQuality(level, result);
}
