import { spawn } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { stripVTControlCharacters } from 'node:util';

import { generateLocalizedGuides } from './generate-localized-guides.mjs';

const requested = new Set(process.argv.slice(2));
const supported = new Set(['--coverage', '--watch']);
const unknown = [...requested].filter((option) => !supported.has(option));
const coverageRequested = requested.has('--coverage');
const minimumFileCoverage = 95;
const maximumTestFileDurationMs = 1000;
const qrFiles = new Set(
  readdirSync(new URL('../src/js/qr/', import.meta.url)).filter((file) =>
    file.endsWith('.js'),
  ),
);

if (unknown.length) {
  throw new Error(`Unknown test runner option: ${unknown.join(', ')}`);
}
if (coverageRequested && requested.has('--watch')) {
  throw new Error('Coverage and watch modes cannot run together.');
}

await generateLocalizedGuides({ clean: true });

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
const environment =
  coverageRequested && !('NO_COLOR' in process.env)
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
const failures =
  result === 0
    ? [
        ...(coverageRequested ? findFileCoverageFailures(output) : []),
        ...findTestDurationFailures(output),
      ]
    : [];
if (failures.length) {
  console.error(
    'Test requirements failed:\n' +
      failures.map((failure) => `- ${failure}`).join('\n'),
  );
}
process.exitCode = result || failures.length ? 1 : 0;
