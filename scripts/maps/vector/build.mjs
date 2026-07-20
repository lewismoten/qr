import { spawn, spawnSync } from 'node:child_process';
import { mkdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { validateVectorLayers } from './prepare.mjs';
import { prepareVectorInputs } from './prepare.mjs';
import {
  archiveManifestPath,
  compactBuildSettings,
  planArchiveBands,
} from './budget.mjs';
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
const maximumZoom = Number.parseInt(option('maximum-zoom', '17'), 10);
const baseZoom = Number.parseInt(option('base-zoom', '16'), 10);
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

if (values.includes('--help')) {
  console.log(`Usage: npm run maps:build -- [options]

Builds budgeted MVT-in-PMTiles zoom-band archives with Tippecanoe.

Options:
  --cache path          Downloaded GeoJSON source directory
  --input path          Temporary normalized GeoJSON sequence directory
  --output file         Filename stem for the PMTiles archive set
  --minimum-zoom 1      First generated zoom level
  --maximum-zoom 17     Last generated zoom level
  --base-zoom 16        Zoom where all point features may appear
  --max-tile-kib 16     Maximum compressed MVT tile size
  --max-archive-mib 500 Reject archives larger than this total
  --max-working-mib 1000 Maximum temporary size for any one band
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
console.log('Preparing compact vector layers...');
const inputs = await prepareVectorInputs({ cache, output: input });
for (const item of inputs) {
  console.log(`  ${item.layer}: ${item.features.toLocaleString()} features`);
}

const bands = planArchiveBands({
  minimumZoom,
  maximumZoom,
  maximumArchiveBytes,
  output,
});

async function runBand(band, settings) {
  const temporary = temporaryArchivePath(band.file);
  await rm(temporary, { force: true });
  const args = tippecanoeArguments({
    inputs,
    output: temporary,
    minimumZoom: band.minimumZoom,
    maximumZoom: band.maximumZoom,
    baseZoom,
    ...settings,
  });
  const workingLimit = Math.min(
    maximumWorkingBytes,
    Math.max(band.budgetBytes * 1.5, band.budgetBytes + 32 * 1024 * 1024),
  );
  let observedBytes = 0;
  await new Promise((resolve, reject) => {
    const child = spawn(executable, args, { stdio: 'inherit' });
    const monitor = setInterval(() => {
      stat(temporary)
        .then(({ size }) => {
          observedBytes = size;
          if (size > workingLimit && child.exitCode === null) {
            child.kill('SIGTERM');
          }
        })
        .catch(() => {});
    }, 1000);
    monitor.unref();
    child.on('error', reject);
    child.on('exit', async (code, signal) => {
      clearInterval(monitor);
      observedBytes = (await stat(temporary).catch(() => ({ size: 0 }))).size;
      if (observedBytes > workingLimit) resolve();
      else if (code === 0) resolve();
      else reject(new Error(`Tippecanoe stopped by ${signal || code}.`));
    });
  });
  return { temporary, observedBytes };
}

async function buildBand(band) {
  let settings = { maximumTileBytes, detail };
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const zooms = `z${band.minimumZoom}-${band.maximumZoom}`;
    console.log(
      `Building ${zooms}, attempt ${attempt}, ` +
        `${(band.budgetBytes / 1024 / 1024).toFixed(1)} MiB budget, ` +
        `${(settings.maximumTileBytes / 1024).toFixed(1)} KiB tiles...`,
    );
    const result = await runBand(band, settings);
    if (result.observedBytes <= band.budgetBytes) {
      const bytes = await validatePmtilesArchive(
        result.temporary,
        band.budgetBytes,
      );
      return { ...band, ...settings, bytes, temporary: result.temporary };
    }
    const next = compactBuildSettings({
      ...settings,
      budgetBytes: band.budgetBytes,
      observedBytes: result.observedBytes,
    });
    await rm(result.temporary, { force: true });
    if (
      next.maximumTileBytes === settings.maximumTileBytes &&
      next.detail === settings.detail
    ) {
      break;
    }
    settings = next;
  }
  throw new Error(
    `Unable to compact zooms ${band.minimumZoom}-${band.maximumZoom} ` +
      `within ${(band.budgetBytes / 1024 / 1024).toFixed(1)} MiB.`,
  );
}

const temporaryFiles = bands.map((band) => temporaryArchivePath(band.file));
try {
  const results = [];
  for (const band of bands) results.push(await buildBand(band));
  for (const result of results) await rename(result.temporary, result.file);
  const manifest = {
    version: 1,
    minimumZoom,
    maximumZoom,
    maximumArchiveMiB,
    archives: results.map((result) => ({
      minimumZoom: result.minimumZoom,
      maximumZoom: result.maximumZoom,
      file: path.basename(result.file),
      bytes: result.bytes,
      budgetBytes: result.budgetBytes,
      maximumTileBytes: result.maximumTileBytes,
      detail: result.detail,
    })),
  };
  const manifestFile = archiveManifestPath(output);
  const temporaryManifest = `${manifestFile}.partial`;
  await writeFile(temporaryManifest, `${JSON.stringify(manifest, null, 2)}\n`);
  await rename(temporaryManifest, manifestFile);
  const total = results.reduce((sum, result) => sum + result.bytes, 0);
  console.log(`Map archives written: ${(total / 1024 / 1024).toFixed(1)} MiB.`);
} catch (error) {
  await Promise.all(temporaryFiles.map((file) => rm(file, { force: true })));
  throw error;
}
