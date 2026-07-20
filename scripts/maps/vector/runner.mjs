import { spawn, spawnSync } from 'node:child_process';
import { stat } from 'node:fs/promises';

import {
  createTippecanoeOutput,
  formatTippecanoeSummary,
} from '../reporting/run-log.mjs';

export function validateTippecanoeExecutable(executable) {
  const available = spawnSync(executable, ['--version'], {
    encoding: 'utf8',
  });
  if (available.error?.code === 'ENOENT') {
    throw new Error(
      'Tippecanoe is required to build PMTiles. On macOS, run ' +
        '`brew install tippecanoe`, then retry.',
    );
  }
  if (available.status !== 0) {
    throw new Error(available.stderr || 'Unable to run Tippecanoe.');
  }
}

export async function runTippecanoe({
  executable,
  args,
  temporary,
  workingLimit,
  zoom,
  log,
  context,
}) {
  const started = Date.now();
  let observedBytes = 0;
  let workingLimitExceeded = false;
  await new Promise((resolve, reject) => {
    const output = createTippecanoeOutput((line) => {
      process.stderr.write(`${line}\n`);
    });
    const child = spawn(executable, args, {
      stdio: ['ignore', 'inherit', 'pipe'],
    });
    child.stderr.on('data', (chunk) => output.write(chunk));
    const monitor = setInterval(() => {
      stat(temporary)
        .then(({ size }) => {
          observedBytes = size;
          if (size > workingLimit && child.exitCode === null) {
            workingLimitExceeded = true;
            child.kill('SIGTERM');
          }
        })
        .catch(() => {});
    }, 1000);
    monitor.unref();
    child.on('error', (error) => {
      clearInterval(monitor);
      log?.recordError('tippecanoe-error', error, context);
      reject(error);
    });
    child.on('exit', async (code, signal) => {
      clearInterval(monitor);
      observedBytes = (await stat(temporary).catch(() => ({ size: 0 }))).size;
      const summary = output.finish();
      const message = formatTippecanoeSummary(summary);
      if (message) console.warn(message);
      log?.record('tippecanoe-complete', {
        ...context,
        durationMs: Date.now() - started,
        observedBytes,
        code,
        signal,
        summary,
      });
      if (workingLimitExceeded || observedBytes > workingLimit) {
        const observedMiB = (observedBytes / 1024 / 1024).toFixed(1);
        const limitMiB = (workingLimit / 1024 / 1024).toFixed(1);
        const error = new Error(
          `Zoom ${zoom} temporary output reached ${observedMiB} MiB, ` +
            `exceeding its ${limitMiB} MiB working-size limit.`,
        );
        error.workingLimitExceeded = true;
        log?.recordError('tippecanoe-error', error, context);
        reject(error);
      } else if (code === 0) {
        resolve();
      } else {
        const error = new Error(`Tippecanoe stopped by ${signal || code}.`);
        error.exitCode = code;
        log?.recordError('tippecanoe-error', error, context);
        reject(error);
      }
    });
  });
  return observedBytes;
}
