import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { initializeKanji, qrScenarios } from '../benchmarks/qr-scenarios.mjs';

const argumentsList = process.argv.slice(2);

function getOption(name) {
  const prefix = `--${name}=`;
  return argumentsList
    .find((value) => value.startsWith(prefix))
    ?.slice(prefix.length);
}

function getPositiveNumber(name, fallback) {
  const raw = getOption(name);
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`--${name} must be a positive number.`);
  }
  return value;
}

const quick = argumentsList.includes('--quick');
const savePath = getOption('save');
const baselinePath = getOption('baseline');
const sampleCount = Math.floor(getPositiveNumber('samples', quick ? 3 : 9));
const iterationScale = getPositiveNumber('scale', quick ? 0.25 : 1);
const threshold = getPositiveNumber('threshold', 20);
const knownOptions = new Set(['--quick']);
const knownPrefixes = [
  '--save=',
  '--baseline=',
  '--samples=',
  '--scale=',
  '--threshold=',
];
const unknown = argumentsList.filter(
  (value) =>
    !knownOptions.has(value) &&
    !knownPrefixes.some((prefix) => value.startsWith(prefix)),
);
if (unknown.length) throw new Error(`Unknown option: ${unknown.join(', ')}`);

const collectGarbage = globalThis.gc || (() => {});
const percentile = (values, fraction) => {
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(
    sorted.length - 1,
    Math.ceil(sorted.length * fraction) - 1,
  );
  return sorted[index];
};
const round = (value, places = 3) => Number(value.toFixed(places));

function runOperations(scenario, iterations) {
  for (let index = 0; index < iterations; index += 1) scenario.run();
}

function measureTime(scenario, iterations) {
  const samples = [];
  for (let sample = 0; sample < sampleCount; sample += 1) {
    const startedAt = performance.now();
    runOperations(scenario, iterations);
    samples.push((performance.now() - startedAt) / iterations);
  }
  return {
    medianMs: round(percentile(samples, 0.5)),
    p95Ms: round(percentile(samples, 0.95)),
    operationsPerSecond: round(1000 / percentile(samples, 0.5), 1),
  };
}

function measureMemory(scenario, iterations) {
  const retainedSamples = [];
  let peakHeapBytes = 0;
  for (let sample = 0; sample < sampleCount; sample += 1) {
    collectGarbage();
    const before = process.memoryUsage().heapUsed;
    runOperations(scenario, iterations);
    const peak = process.memoryUsage().heapUsed;
    collectGarbage();
    const after = process.memoryUsage().heapUsed;
    peakHeapBytes = Math.max(peakHeapBytes, peak - before);
    retainedSamples.push(after - before);
  }
  return {
    peakHeapBytes: Math.max(0, Math.round(peakHeapBytes)),
    retainedHeapBytes: Math.round(percentile(retainedSamples, 0.5)),
  };
}

function measureScenario(scenario) {
  const iterations = Math.max(
    1,
    Math.round(scenario.iterations * iterationScale),
  );
  runOperations(scenario, Math.min(iterations, 3));
  return {
    name: scenario.name,
    iterations,
    ...measureTime(scenario, iterations),
    ...measureMemory(scenario, iterations),
  };
}

function formatBytes(value) {
  const absolute = Math.abs(value);
  if (absolute < 1024) return `${value} B`;
  if (absolute < 1024 ** 2) return `${round(value / 1024, 1)} KiB`;
  return `${round(value / 1024 ** 2, 1)} MiB`;
}

function printResults(results) {
  console.table(
    results.map((result) => ({
      scenario: result.name,
      iterations: result.iterations,
      'median ms': result.medianMs,
      'p95 ms': result.p95Ms,
      'ops/sec': result.operationsPerSecond,
      'peak heap': formatBytes(result.peakHeapBytes),
      retained: formatBytes(result.retainedHeapBytes),
    })),
  );
}

async function saveReport(path, report) {
  const destination = resolve(path);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Saved benchmark report to ${destination}`);
}

async function compareBaseline(path, results) {
  const baseline = JSON.parse(await readFile(resolve(path), 'utf8'));
  const previous = new Map(
    baseline.scenarios.map((scenario) => [scenario.name, scenario]),
  );
  const regressions = [];
  results.forEach((result) => {
    const reference = previous.get(result.name);
    if (!reference) return;
    for (const metric of ['medianMs', 'peakHeapBytes']) {
      if (!(reference[metric] > 0)) continue;
      const change =
        ((result[metric] - reference[metric]) / reference[metric]) * 100;
      if (change > threshold) {
        regressions.push(
          `${result.name} ${metric} increased ${round(change, 1)}%`,
        );
      }
    }
  });
  if (!regressions.length) {
    console.log(`No regressions exceeded ${threshold}%.`);
    return;
  }
  regressions.forEach((regression) => console.error(`- ${regression}`));
  process.exitCode = 1;
}

collectGarbage();
const kanjiStartedAt = performance.now();
initializeKanji();
const kanjiInitializationMs = round(performance.now() - kanjiStartedAt);
const scenarios = qrScenarios.map(measureScenario);
const report = {
  generatedAt: new Date().toISOString(),
  runtime: {
    node: process.version,
    platform: process.platform,
    architecture: process.arch,
    garbageCollectionExposed: typeof globalThis.gc === 'function',
  },
  configuration: { sampleCount, iterationScale, threshold },
  kanjiInitializationMs,
  scenarios,
};

console.log(`Kanji first-use initialization: ${kanjiInitializationMs} ms`);
printResults(scenarios);
if (!globalThis.gc) {
  console.warn('Run Node with --expose-gc for stable retained-memory results.');
}
if (savePath) await saveReport(savePath, report);
if (baselinePath) await compareBaseline(baselinePath, scenarios);
