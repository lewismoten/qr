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
