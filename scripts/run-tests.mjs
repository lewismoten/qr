import { spawn } from 'node:child_process';

const requested = new Set(process.argv.slice(2));
const supported = new Set(['--coverage', '--watch']);
const unknown = [...requested].filter((option) => !supported.has(option));
const coverageRequested = requested.has('--coverage');
const minimumFileCoverage = 95;

if (unknown.length) {
  throw new Error(`Unknown test runner option: ${unknown.join(', ')}`);
}
if (coverageRequested && requested.has('--watch')) {
  throw new Error('Coverage and watch modes cannot run together.');
}

const nodeOptions = ['--test', '--test-reporter=spec'];

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
  const rowPattern = new RegExp(
    String.raw`^.*?([^\s|]+\.js)\s+\|\s+([\d.]+)\s+\|` +
      String.raw`\s+([\d.]+)\s+\|\s+([\d.]+)`,
    'gm',
  );
  const matches = [...output.matchAll(rowPattern)];
  if (!matches.length) return ['No per-file coverage rows were found.'];
  return matches.flatMap((match) => {
    const [, file, lines, branches, functions] = match;
    return [
      ['lines', Number(lines)],
      ['branches', Number(branches)],
      ['functions', Number(functions)],
    ]
      .filter(([, value]) => value <= minimumFileCoverage)
      .map(
        ([metric, value]) =>
          `${file}: ${metric} coverage is ${value.toFixed(2)}%`,
      );
  });
}

let output = '';
const stdio = coverageRequested ? ['inherit', 'pipe', 'pipe'] : 'inherit';
const child = spawn(process.execPath, nodeOptions, { stdio });
if (coverageRequested) {
  for (const [stream, destination] of [
    [child.stdout, process.stdout],
    [child.stderr, process.stderr],
  ]) {
    stream.on('data', (chunk) => {
      output += chunk;
      destination.write(chunk);
    });
  }
}
const result = await new Promise((resolve) => child.once('exit', resolve));
const failures = result === 0 ? findFileCoverageFailures(output) : [];
if (failures.length) {
  console.error(
    `Each file must exceed ${minimumFileCoverage}% coverage:\n` +
      failures.map((failure) => `- ${failure}`).join('\n'),
  );
}
process.exitCode = result || failures.length ? 1 : 0;
