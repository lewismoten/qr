import { spawn } from 'node:child_process';
import { stat } from 'node:fs/promises';

export async function runTippecanoe({
  executable,
  args,
  temporary,
  workingLimit,
  zoom,
}) {
  let observedBytes = 0;
  let workingLimitExceeded = false;
  await new Promise((resolve, reject) => {
    const child = spawn(executable, args, { stdio: 'inherit' });
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
      reject(error);
    });
    child.on('exit', async (code, signal) => {
      clearInterval(monitor);
      observedBytes = (await stat(temporary).catch(() => ({ size: 0 }))).size;
      if (workingLimitExceeded || observedBytes > workingLimit) {
        const observedMiB = (observedBytes / 1024 / 1024).toFixed(1);
        const limitMiB = (workingLimit / 1024 / 1024).toFixed(1);
        const error = new Error(
          `Zoom ${zoom} temporary output reached ${observedMiB} MiB, ` +
            `exceeding its ${limitMiB} MiB working-size limit.`,
        );
        error.workingLimitExceeded = true;
        reject(error);
      } else if (code === 0) {
        resolve();
      } else {
        const error = new Error(`Tippecanoe stopped by ${signal || code}.`);
        error.exitCode = code;
        reject(error);
      }
    });
  });
  return observedBytes;
}
