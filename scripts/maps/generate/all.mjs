import { availableParallelism } from 'node:os';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));
const mapsDirectory = path.dirname(directory);
const root = path.resolve(mapsDirectory, '../..');
const argumentsList = process.argv.slice(2);

function option(name, fallback) {
  const exact = argumentsList.find((value) => value.startsWith(`--${name}=`));
  if (exact) return exact.slice(name.length + 3);
  const index = argumentsList.indexOf(`--${name}`);
  return index >= 0 ? argumentsList[index + 1] : fallback;
}

const has = (name) => argumentsList.includes(`--${name}`);

if (has('help')) {
  console.log(`Usage: npm run maps:generate -- [options]

Downloads all map sources and rebuilds zooms 1 through 11.

Options:
  --jobs 8              Maximum parallel tile workers
  --cache path          Download cache directory
  --output path         Tile output directory
  --max-tile-kib 24     Simplify tiles larger than this target
  --bundle-from 6       First zoom stored in SVG bundles
  --bundle-size 4       Width and height of each tile bundle
  --resume              Keep existing tile files where possible`);
  process.exit(0);
}

const jobs = option(
  'jobs',
  String(Math.max(1, Math.min(8, availableParallelism() - 1))),
);
const cache = option('cache', '.cache/maps/natural-earth');
const output = option('output', 'build/maps/tiles');
const maximum = option('max-tile-kib', '24');
const bundleFrom = option('bundle-from', '6');
const bundleSize = option('bundle-size', '4');
const force = has('resume') ? [] : ['--force'];

function run(script, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...args], {
      cwd: root,
      stdio: 'inherit',
    });
    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (code === 0) resolve();
      else {
        reject(
          new Error(
            signal
              ? `Map build stopped by ${signal}.`
              : `Map build exited with status ${code}.`,
          ),
        );
      }
    });
  });
}

const common = [
  '--jobs',
  jobs,
  '--cache',
  cache,
  '--output',
  output,
  '--max-tile-kib',
  maximum,
  '--bundle-from',
  bundleFrom,
  '--bundle-size',
  bundleSize,
  ...force,
];
const download = path.join(mapsDirectory, 'sources/download.mjs');
const build = path.join(mapsDirectory, 'build-svg-tiles.mjs');
const started = Date.now();

console.log('Stage 1/4: downloading and validating map sources');
await run(download, ['--cache', cache]);
console.log('Stage 2/4: rebuilding zoom levels 1 through 9');
await run(build, ['--zoom', '1-9', ...common]);
console.log('Stage 3/4: extending indexed coverage through zoom level 10');
await run(build, ['--zoom', '10', '--extend', ...common]);
console.log('Stage 4/4: extending indexed coverage through zoom level 11');
await run(build, ['--zoom', '11', '--extend', ...common]);

const minutes = (Date.now() - started) / 60000;
console.log(`Map generation completed in ${minutes.toFixed(1)} minutes.`);
