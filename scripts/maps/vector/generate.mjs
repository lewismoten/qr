import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));
const maps = path.dirname(directory);
const root = path.resolve(maps, '../..');
const args = process.argv.slice(2);

function run(script, values) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...values], {
      cwd: root,
      stdio: 'inherit',
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
const started = Date.now();

console.log('Stage 1/2: downloading and validating map sources');
await run(path.join(maps, 'sources/download.mjs'), downloadArgs);
console.log('Stage 2/2: building the MVT PMTiles archive');
await run(path.join(directory, 'build.mjs'), args);
console.log(
  `Map generation completed in ${((Date.now() - started) / 60000).toFixed(1)}` +
    ' minutes.',
);
