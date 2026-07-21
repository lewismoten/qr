import { spawn } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { stripVTControlCharacters } from 'node:util';

import { generateLocalizedGuides } from './guides/generate-localized-guides.mjs';
import { buildLocaleResources } from './locales/resources.mjs';
import { enforceObjectKeys } from '../tests/architecture/naming/object-key-check.js';

const requested = new Set(process.argv.slice(2));
const supported = new Set(['--coverage', '--watch']);
const unknown = [...requested].filter((option) => !supported.has(option));
const coverageRequested = requested.has('--coverage');
const minimumFileCoverage = 95;
const maximumBuildDurationMs = 1_000;
const maximumTestFileDurationMs = 200;
const qrRoot = new URL('../src/js/qr/', import.meta.url);

function listQrFiles(directory = qrRoot, prefix = '') {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      return listQrFiles(new URL(`${entry.name}/`, directory), relative);
    }
    return entry.name.endsWith('.js') ? [relative] : [];
  });
}

const qrPaths = listQrFiles();
const qrFiles = new Set(qrPaths.map((file) => file.split('/').at(-1)));

if (qrFiles.size !== qrPaths.length) {
  throw new Error(
    'QR module filenames must remain unique for coverage checks.',
  );
}

if (unknown.length) {
  throw new Error(`Unknown test runner option: ${unknown.join(', ')}`);
}
if (coverageRequested && requested.has('--watch')) {
  throw new Error('Coverage and watch modes cannot run together.');
}

async function enforceBuildDuration() {
  const startedAt = performance.now();
  const child = spawn(
    process.execPath,
    ['scripts/build.mjs', '--compile-only', '--quiet'],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );
  let output = '';
  for (const stream of [child.stdout, child.stderr]) {
    stream.on('data', (chunk) => {
      output += chunk;
    });
  }
  const result = await new Promise((resolve) => child.once('exit', resolve));
  const durationMs = performance.now() - startedAt;
  console.log(
    `Production build: ${durationMs.toFixed(2)}ms ` +
      `(limit ${maximumBuildDurationMs}ms)`,
  );
  if (result) {
    throw new Error(
      `Production build exited with status ${result}.\n${output.trim()}`,
    );
  }
  if (durationMs > maximumBuildDurationMs) {
    throw new Error(
      `Production build took ${durationMs.toFixed(2)}ms; maximum is ` +
        `${maximumBuildDurationMs}ms.`,
    );
  }
}

await enforceBuildDuration();
await enforceObjectKeys();

await generateLocalizedGuides({ clean: true });
await buildLocaleResources();

const nodeOptions = ['--test', '--test-concurrency=8', '--test-reporter=spec'];

if (requested.has('--watch')) nodeOptions.push('--watch');
if (coverageRequested) {
  nodeOptions.push(
    '--experimental-test-coverage',
    '--test-coverage-include=src/js/**/*.js',
    '--test-coverage-exclude=src/js/main.js',
    '--test-coverage-exclude=src/js/spec/**',
    '--test-coverage-lines=95',
    '--test-coverage-branches=96',
    '--test-coverage-functions=95',
  );
}

function findFileCoverageFailures(output) {
  const plainOutput = stripVTControlCharacters(output);
  const rowPattern = new RegExp(
    String.raw`^.*?([^\s|]+\.js)\s+\|\s+([\d.]+)\s+\|` +
      String.raw`\s+([\d.]+)\s+\|\s+([\d.]+)`,
    'gm',
  );
  const matches = [...plainOutput.matchAll(rowPattern)];
  if (!matches.length) return ['No per-file coverage rows were found.'];
  const reportedFiles = new Set(matches.map((match) => match[1]));
  const missingQrFiles = [...qrFiles]
    .filter((file) => !reportedFiles.has(file))
    .map((file) => `${file}: missing from the coverage report`);
  const metricFailures = matches.flatMap((match) => {
    const [, file, lines, branches, functions] = match;
    const isQrFile = qrFiles.has(file);
    return [
      ['lines', Number(lines)],
      ['branches', Number(branches)],
      ['functions', Number(functions)],
    ]
      .filter(([, value]) =>
        isQrFile ? value < 100 : value <= minimumFileCoverage,
      )
      .map(
        ([metric, value]) =>
          `${file}: ${metric} coverage is ${value.toFixed(2)}%`,
      );
  });
  return [...missingQrFiles, ...metricFailures];
}

function findTestDurationFailures(output) {
  const plainOutput = stripVTControlCharacters(output);
  const durationPattern = /^.*?(tests\/[\w./-]+\.test\.js) \(([\d.]+)ms\)$/gm;
  return [...plainOutput.matchAll(durationPattern)]
    .filter(([, , duration]) => Number(duration) > maximumTestFileDurationMs)
    .map(
      ([, file, duration]) =>
        `${file}: ${Number(duration).toFixed(2)}ms exceeds ` +
        `${maximumTestFileDurationMs}ms`,
    );
}

let output = '';
const stdio = ['inherit', 'pipe', 'pipe'];
const environment = !('NO_COLOR' in process.env)
  ? { ...process.env, FORCE_COLOR: process.env.FORCE_COLOR || '1' }
  : process.env;
const child = spawn(process.execPath, nodeOptions, {
  stdio,
  env: environment,
});
for (const [stream, destination] of [
  [child.stdout, process.stdout],
  [child.stderr, process.stderr],
]) {
  stream.on('data', (chunk) => {
    output += chunk;
    destination.write(chunk);
  });
}
const result = await new Promise((resolve) => child.once('exit', resolve));
const hasCoverageReport = output.includes('end of coverage report');
const failures = [
  ...(coverageRequested && hasCoverageReport
    ? findFileCoverageFailures(output)
    : []),
  ...(coverageRequested ? [] : findTestDurationFailures(output)),
];
if (failures.length) {
  console.error(
    'Test requirements failed:\n' +
      failures.map((failure) => `- ${failure}`).join('\n'),
  );
}
process.exitCode = result || failures.length ? 1 : 0;
