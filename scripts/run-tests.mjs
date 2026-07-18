import { spawn } from 'node:child_process';

const requested = new Set(process.argv.slice(2));
const supported = new Set(['--coverage', '--watch']);
const unknown = [...requested].filter((option) => !supported.has(option));

if (unknown.length) {
  throw new Error(`Unknown test runner option: ${unknown.join(', ')}`);
}
if (requested.has('--coverage') && requested.has('--watch')) {
  throw new Error('Coverage and watch modes cannot run together.');
}

const nodeOptions = ['--test', '--test-reporter=spec'];

if (requested.has('--watch')) nodeOptions.push('--watch');
if (requested.has('--coverage')) {
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

const child = spawn(process.execPath, nodeOptions, { stdio: 'inherit' });
const result = await new Promise((resolve) => child.once('exit', resolve));
process.exitCode = result ?? 1;
