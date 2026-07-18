const colorEnabled =
  !('NO_COLOR' in process.env) &&
  (process.stdout.isTTY || process.env.FORCE_COLOR === '1');
const color = (code, text) =>
  colorEnabled ? `\u001b[${code}m${text}\u001b[0m` : text;
const bold = (text) => color('1', text);
const red = (text) => color('31;1', text);
const yellow = (text) => color('33;1', text);

function round(value, places = 1) {
  return Number(value.toFixed(places));
}

function formatBytes(value) {
  const absolute = Math.abs(value);
  if (absolute < 1024) return `${value} B`;
  if (absolute < 1024 ** 2) return `${round(value / 1024)} KiB`;
  return `${round(value / 1024 ** 2)} MiB`;
}

function heatLabel(index) {
  if (index === 0) return red('HOT');
  if (index < 3) return yellow('WARM');
  return '    ';
}

export function printBenchmarkReport(report) {
  console.log(`${bold('Kanji first use:')} ${report.kanjiInitializationMs} ms`);
  console.log('');
  console.log(bold('Scenarios, slowest first'));
  [...report.scenarios]
    .sort((left, right) => right.medianMs - left.medianMs)
    .forEach((result, index) => {
      console.log(`${heatLabel(index)} ${index + 1}. ${result.name}`);
      console.log(
        `     ${result.medianMs} ms/op | p95 ${result.p95Ms} ms | ` +
          `${result.operationsPerSecond} ops/s`,
      );
      console.log(
        `     heap/op ${formatBytes(result.peakHeapBytes)} peak | ` +
          `${formatBytes(result.retainedHeapBytes)} retained | ` +
          `${result.iterations} iterations`,
      );
    });

  if (report.cpuProfile.hotspots.length) {
    console.log('');
    const operations = report.cpuProfile.operationCount;
    console.log(bold(`CPU hotspots, fixed ${operations}-operation sample`));
    report.cpuProfile.hotspots.forEach((hotspot, index) => {
      const location = `${hotspot.file}:${hotspot.line}`;
      console.log(
        `${heatLabel(index)} ${index + 1}. ${hotspot.name} (${location})`,
      );
      console.log(
        `     ${hotspot.selfMicrosecondsPerOperation} us/op self | ` +
          `${hotspot.sampleSharePercent}% sample share`,
      );
    });
  }

  console.log('');
  console.log(bold('How to read this'));
  console.log('  ms/op and p95: lower is faster; p95 shows slower runs.');
  console.log('  Peak heap/op: estimated temporary allocation per operation.');
  console.log('  Retained: heap remaining after GC; small changes are noise.');
  console.log('  CPU hotspot: sampled self-time over the same fixed workload.');
  console.log(
    '  Sample share is relative; a higher share may still be faster.',
  );
  console.log('  JIT-inlined child work may be attributed to its parent.');
}
