import { spawn, spawnSync } from 'node:child_process';
import { mkdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { validateVectorLayers } from './prepare.mjs';
import { prepareVectorInputs } from './prepare.mjs';
import {
  availableLevelBudget,
  archiveManifestPath,
  compactBuildSettings,
  planArchiveLevels,
  updateBudgetCarry,
} from './budget.mjs';
import { tippecanoeArguments } from './command.mjs';
import {
  smallestArchivePath,
  temporaryArchivePath,
  validatePmtilesArchive,
} from './output.mjs';

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
const maximumZoom = Number.parseInt(option('maximum-zoom', '19'), 10);
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
const budgetGrowth = Number.parseFloat(option('budget-growth', '1.3'));
const minimumLevelBytes =
  Number.parseInt(option('minimum-level-kib', '128'), 10) * 1024;
const executable = process.env.TIPPECANOE || 'tippecanoe';

if (values.includes('--help')) {
  console.log(`Usage: npm run maps:build -- [options]

Builds one budgeted MVT-in-PMTiles archive per zoom with Tippecanoe.

Options:
  --cache path          Downloaded GeoJSON source directory
  --input path          Temporary normalized GeoJSON sequence directory
  --output file         Filename stem for the PMTiles archive set
  --minimum-zoom 1      First generated zoom level
  --maximum-zoom 19     Last generated zoom level
  --base-zoom 16        Zoom where all point features may appear
  --max-tile-kib 16     Maximum compressed MVT tile size
  --max-archive-mib 500 Reject archives larger than this total
  --max-working-mib 1000 Maximum temporary size for any one level
  --detail 11           Maximum geometry precision (2^detail extent)
  --budget-growth 1.3   Relative budget growth within each zoom tier
  --minimum-level-kib 128 Minimum budget reserved for every level`);
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

const levels = planArchiveLevels({
  minimumZoom,
  maximumZoom,
  maximumArchiveBytes,
  output,
  growth: budgetGrowth,
  minimumLevelBytes,
});

async function runLevel(level, settings) {
  const temporary = temporaryArchivePath(level.file);
  await rm(temporary, { force: true });
  const args = tippecanoeArguments({
    inputs,
    output: temporary,
    minimumZoom: level.minimumZoom,
    maximumZoom: level.maximumZoom,
    baseZoom,
    ...settings,
  });
  const workingLimit = Math.min(
    maximumWorkingBytes,
    Math.max(level.budgetBytes * 1.5, level.budgetBytes + 32 * 1024 * 1024),
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
      else {
        const error = new Error(`Tippecanoe stopped by ${signal || code}.`);
        error.exitCode = code;
        reject(error);
      }
    });
  });
  return { temporary, observedBytes };
}

async function buildLevel(level, allocatedBudgetBytes) {
  const allocation = { ...level, budgetBytes: allocatedBudgetBytes };
  const smallestFile = smallestArchivePath(level.file);
  await rm(smallestFile, { force: true });
  let best = null;
  let settings = { maximumTileBytes, detail };

  const acceptSmallest = () => {
    const debt = (best.bytes - allocatedBudgetBytes) / 1024 / 1024;
    console.warn(
      `Zoom ${level.minimumZoom} reached its compaction limit; ` +
        `carrying ${debt.toFixed(1)} MiB debt.`,
    );
    return best;
  };

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const zoom = `z${level.minimumZoom}`;
    console.log(
      `Building ${zoom}, attempt ${attempt}, ` +
        `${(allocatedBudgetBytes / 1024 / 1024).toFixed(1)} MiB budget, ` +
        `${(settings.maximumTileBytes / 1024).toFixed(1)} KiB tiles...`,
    );
    let result;
    try {
      result = await runLevel(allocation, settings);
    } catch (error) {
      if (error.exitCode === 100 && best) {
        await rm(temporaryArchivePath(level.file), { force: true });
        return acceptSmallest();
      }
      throw error;
    }
    const bytes = await validatePmtilesArchive(
      result.temporary,
      Number.MAX_SAFE_INTEGER,
    );
    if (bytes <= allocatedBudgetBytes) {
      await rm(smallestFile, { force: true });
      return {
        ...level,
        ...settings,
        allocatedBudgetBytes,
        bytes,
        temporary: result.temporary,
      };
    }
    if (!best || bytes < best.bytes) {
      await rm(smallestFile, { force: true });
      await rename(result.temporary, smallestFile);
      best = {
        ...level,
        ...settings,
        allocatedBudgetBytes,
        bytes,
        temporary: smallestFile,
      };
    } else {
      await rm(result.temporary, { force: true });
    }
    const next = compactBuildSettings({
      ...settings,
      budgetBytes: allocatedBudgetBytes,
      observedBytes: bytes,
    });
    const smallest =
      attempt === 5 ||
      (next.maximumTileBytes === settings.maximumTileBytes &&
        next.detail === settings.detail);
    if (smallest) {
      return acceptSmallest();
    }
    settings = next;
  }
  throw new Error(`Unable to build zoom ${level.minimumZoom}.`);
}

const temporaryFiles = levels.flatMap((level) => [
  temporaryArchivePath(level.file),
  smallestArchivePath(level.file),
]);
try {
  const results = [];
  let carryBytes = 0;
  for (const level of levels) {
    const allocatedBudgetBytes = availableLevelBudget({
      plannedBytes: level.budgetBytes,
      carryBytes,
      minimumLevelBytes,
    });
    const result = await buildLevel(level, allocatedBudgetBytes);
    carryBytes = updateBudgetCarry({
      carryBytes,
      plannedBytes: level.budgetBytes,
      actualBytes: result.bytes,
    });
    result.carryBytes = carryBytes;
    results.push(result);
  }
  if (carryBytes < 0) {
    throw new Error(
      `Minimum map archives exceed the total budget by ` +
        `${(-carryBytes / 1024 / 1024).toFixed(1)} MiB.`,
    );
  }
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
      plannedBudgetBytes: result.budgetBytes,
      allocatedBudgetBytes: result.allocatedBudgetBytes,
      carryBytes: result.carryBytes,
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
