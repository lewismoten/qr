import { rename } from 'node:fs/promises';

import { archiveManifestPath } from '../budget.mjs';
import { writeArchiveManifest } from '../output.mjs';

export async function finalizeArchiveSet({
  results,
  output,
  minimumZoom,
  maximumZoom,
  maximumArchiveMiB,
  maximumArchiveBytes,
  log,
}) {
  const totalBytes = results.reduce((sum, result) => sum + result.bytes, 0);
  const overageBytes = Math.max(0, totalBytes - maximumArchiveBytes);
  if (overageBytes) {
    console.warn(
      'Map archives exceed the target by ' +
        `${(overageBytes / 1024 / 1024).toFixed(1)} MiB; publishing them.`,
    );
  }
  for (const result of results) await rename(result.temporary, result.file);
  await writeArchiveManifest({
    manifestFile: archiveManifestPath(output),
    results,
    minimumZoom,
    maximumZoom,
    maximumArchiveMiB,
    totalBytes,
    overageBytes,
  });
  console.log(
    `Map archives written: ${(totalBytes / 1024 / 1024).toFixed(1)} MiB.`,
  );
  log.record('run-complete', {
    durationMs: Date.now() - log.startedAt,
    archiveCount: results.length,
    totalBytes,
    targetBytes: maximumArchiveBytes,
    overageBytes,
    overBudget: overageBytes > 0,
  });
}
