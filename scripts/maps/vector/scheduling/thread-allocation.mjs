export function allocateTippecanoeThreads({
  archiveCount,
  concurrentJobs,
  configuredThreads,
  dynamic,
  availableThreads,
}) {
  if (!dynamic) return configuredThreads;
  const workers = Math.max(1, Math.min(archiveCount, concurrentJobs));
  return Math.max(1, Math.floor(availableThreads / workers));
}
