import { spawn, spawnSync } from 'node:child_process';
import { mkdir, rename, rm, stat } from 'node:fs/promises';
import path from 'node:path';

import { validateVectorLayers } from './prepare.mjs';
import { prepareVectorInputs } from './prepare.mjs';
import { tippecanoeArguments } from './command.mjs';
import { temporaryArchivePath, validatePmtilesArchive } from './output.mjs';

const values = process.argv.slice(2);

function option(name, fallback) {
  const exact = values.find((value) => value.startsWith(`--${name}=`));
  if (exact) return exact.slice(name.length + 3);
  const index = values.indexOf(`--${name}`);
  return index >= 0 ? values[index + 1] : fallback;
}

const cache = path.resolve(option('cache', '.cache/maps/natural-earth'));
const input = path.resolve(option('input', '.cache/maps/vector-input'));
const output = path.resolve(option('output', 'build/maps/local.pmtiles'));
const minimumZoom = Number.parseInt(option('minimum-zoom', '1'), 10);
const maximumZoom = Number.parseInt(option('maximum-zoom', '15'), 10);
const baseZoom = Number.parseInt(option('base-zoom', '14'), 10);
const maximumTileBytes =
  Number.parseInt(option('max-tile-kib', '16'), 10) * 1024;
const maximumArchiveMiB = Number.parseInt(option('max-archive-mib', '500'), 10);
const maximumWorkingMiB = Number.parseInt(
  option('max-working-mib', String(maximumArchiveMiB * 2)),
  10,
);
const maximumArchiveBytes = maximumArchiveMiB * 1024 * 1024;
const maximumWorkingBytes = maximumWorkingMiB * 1024 * 1024;
const detail = Number.parseInt(option('detail', '11'), 10);
const executable = process.env.TIPPECANOE || 'tippecanoe';
const temporaryOutput = temporaryArchivePath(output);

if (values.includes('--help')) {
  console.log(`Usage: npm run maps:build -- [options]

Builds one MVT-in-PMTiles archive with Tippecanoe.

Options:
  --cache path          Downloaded GeoJSON source directory
  --input path          Temporary normalized GeoJSON sequence directory
  --output file         PMTiles destination
  --minimum-zoom 1      First generated zoom level
  --maximum-zoom 15     Last generated zoom level
  --base-zoom 14        Zoom where all point features may appear
  --max-tile-kib 16     Maximum compressed MVT tile size
  --max-archive-mib 500 Reject archives larger than this total
  --max-working-mib 1000 Stop if the temporary archive exceeds this
  --detail 11           Maximum geometry precision (2^detail extent)`);
  process.exit(0);
}

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

validateVectorLayers();
await mkdir(path.dirname(output), { recursive: true });
await rm(temporaryOutput, { force: true });
console.log('Preparing compact vector layers...');
const inputs = await prepareVectorInputs({ cache, output: input });
for (const item of inputs) {
  console.log(`  ${item.layer}: ${item.features.toLocaleString()} features`);
}

const args = tippecanoeArguments({
  inputs,
  output: temporaryOutput,
  minimumZoom,
  maximumZoom,
  baseZoom,
  maximumTileBytes,
  detail,
});
console.log(
  `Building ${path.relative(process.cwd(), temporaryOutput)} with ` +
    `${maximumTileBytes / 1024} KiB tiles and a ` +
    `${maximumArchiveMiB} MiB archive budget...`,
);

try {
  await new Promise((resolve, reject) => {
    const child = spawn(executable, args, { stdio: 'inherit' });
    let workingSize = 0;
    const monitor = setInterval(() => {
      stat(temporaryOutput)
        .then(({ size }) => {
          if (size <= maximumWorkingBytes || child.exitCode !== null) return;
          workingSize = size;
          child.kill('SIGTERM');
        })
        .catch((error) => {
          if (error.code !== 'ENOENT' && child.exitCode === null) {
            child.kill('SIGTERM');
          }
        });
    }, 1000);
    monitor.unref();
    child.on('error', reject);
    child.on('exit', (code, signal) => {
      clearInterval(monitor);
      if (workingSize) {
        reject(
          new Error(
            `Temporary map archive exceeded ${maximumWorkingMiB} MiB ` +
              `(${(workingSize / 1024 / 1024).toFixed(1)} MiB).`,
          ),
        );
      } else if (code === 0) resolve();
      else {
        reject(
          new Error(
            signal
              ? `Tippecanoe stopped by ${signal}.`
              : `Tippecanoe exited with status ${code}.`,
          ),
        );
      }
    });
  });
  const archiveBytes = await validatePmtilesArchive(
    temporaryOutput,
    maximumArchiveBytes,
  );
  await rename(temporaryOutput, output);
  console.log(
    `Map archive written: ${(archiveBytes / 1024 / 1024).toFixed(1)} MiB.`,
  );
} catch (error) {
  await rm(temporaryOutput, { force: true });
  throw error;
}
