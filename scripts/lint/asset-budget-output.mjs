const KIBIBYTE = 1024;
const MEBIBYTE = KIBIBYTE * KIBIBYTE;
const REPORT_MISS_LIMIT = 10;

function formatBytes(bytes) {
  if (bytes >= MEBIBYTE) return `${(bytes / MEBIBYTE).toFixed(1)} MiB`;
  return `${(bytes / KIBIBYTE).toFixed(1)} KiB`;
}

export function printAssetBudgetReport(report) {
  const failures = report.checks.filter(({ passed }) => !passed);
  const largestMisses = [...report.targetMisses]
    .sort((left, right) => right.bytes - left.bytes)
    .slice(0, REPORT_MISS_LIMIT);
  console.log(
    `Asset budgets: ${report.checks.length - failures.length}/` +
      `${report.checks.length} enforced checks pass.`,
  );
  console.log(
    `64 KiB raw target: ${report.targetMisses.length} paths remain over.`,
  );
  console.log(
    `Cold startup (${report.startup.files.length} resources): ` +
      `${formatBytes(report.startup.raw)} raw; ` +
      `${formatBytes(report.startup.transfer)} Brotli.`,
  );
  largestMisses.forEach(({ name, bytes }) => {
    console.log(`  ${formatBytes(bytes)}  ${name}`);
  });
  if (!report.mapsAvailable) console.log('Map budgets skipped: no manifest.');
  failures.forEach(({ category, name, bytes, limit }) => {
    console.error(
      `OVER ${category}: ${name} is ${formatBytes(bytes)}; ` +
        `limit ${formatBytes(limit)}.`,
    );
  });
  return failures;
}
