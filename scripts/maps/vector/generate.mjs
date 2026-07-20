import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { readVectorBuildOptions } from '../reporting/options.mjs';
import { createGenerationLog } from '../reporting/run-log.mjs';

const directory = path.dirname(fileURLToPath(import.meta.url));
const maps = path.dirname(directory);
const root = path.resolve(maps, '../..');
const args = process.argv.slice(2);

function run(script, values, environment = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...values], {
      cwd: root,
      stdio: 'inherit',
      env: environment,
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Map stage exited with status ${code}.`));
    });
  });
}

const cacheIndex = args.indexOf('--cache');
const cache = cacheIndex >= 0 ? args[cacheIndex + 1] : undefined;
const downloadArgs = cache ? ['--cache', cache] : [];
const options = readVectorBuildOptions(args);
const log = createGenerationLog({
  output: options.output,
  logFile: options.logFile,
  parameters: options,
});
const hasLogArgument = args.some((value) => value.startsWith('--log-file'));
const buildArgs = hasLogArgument ? args : [...args, '--log-file', log.file];
const started = Date.now();

console.log(`Generation log: ${log.file}`);
try {
  let stageStarted = Date.now();
  console.log('Stage 1/2: downloading and validating map sources');
  log.record('stage-start', { stage: 'download' });
  await run(path.join(maps, 'sources/download.mjs'), downloadArgs);
  log.record('stage-complete', {
    stage: 'download',
    durationMs: Date.now() - stageStarted,
  });
  stageStarted = Date.now();
  console.log('Stage 2/2: building the MVT PMTiles archive');
  log.record('stage-start', { stage: 'build' });
  await run(path.join(directory, 'build-vector-tiles.mjs'), buildArgs, {
    ...process.env,
    MAP_LOG_PARENT: '1',
  });
  log.record('stage-complete', {
    stage: 'build',
    durationMs: Date.now() - stageStarted,
  });
  const durationMs = Date.now() - started;
  console.log(
    `Map generation completed in ${(durationMs / 60000).toFixed(1)} minutes.`,
  );
  log.record('generation-complete', { durationMs });
  log.close();
} catch (error) {
  log.recordError('generation-error', error, {
    durationMs: Date.now() - started,
  });
  log.close();
  throw error;
}
