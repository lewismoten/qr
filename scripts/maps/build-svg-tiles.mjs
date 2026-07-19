import { availableParallelism } from 'node:os';
import { mkdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Worker } from 'node:worker_threads';

import {
  DEFAULT_LAYERS,
  MAP_SOURCES,
  SOURCE_ATTRIBUTION,
} from './source-config.mjs';
import {
  createChildTilePlan,
  createTilePlan,
  formatBytes,
  parseBounds,
  parseZoomRange,
} from './tile-plan.mjs';
import {
  addAvailableTile,
  serializeTileAvailability,
} from './tile-availability.mjs';
import { writeTileBundles } from './tile-bundles.mjs';
import { createTileManifest } from './tile-manifest.mjs';
import { obtainMapSource } from './source-loader.mjs';
import {
  estimateTileOutput,
  progressText,
  readTileManifest,
  reportBuildSummary,
  reportTilePlan,
} from './planning/output-estimate.mjs';

function option(name, fallback) {
  const exact = process.argv.find((value) => value.startsWith(`--${name}=`));
  if (exact) return exact.slice(name.length + 3);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const has = (name) => process.argv.includes(`--${name}`);

if (has('help')) {
  console.log(`Usage: npm run maps:build -- [options]

Options:
  --zoom 1-11           Generate one zoom or an inclusive range
  --layers a,b          Named layers from source-config.mjs
  --bounds world        world or west,south,east,north
  --jobs 8              Maximum parallel worker threads
  --max-tile-kib 24     Simplify tiles larger than this target
  --bundle-from 6       First zoom stored as 4x4 SVG bundles
  --bundle-size 4       Width and height of each detailed bundle
  --output path         Tile output directory
  --cache path          Download cache directory
  --plan                Show counts and estimates without downloading
  --extend              Build one level from existing parent coverage
  --force               Replace tiles that already exist`);
  process.exit(0);
}
const zoom = parseZoomRange(option('zoom', '1-9'));
const boundsValue = option('bounds', 'world');
const bounds = parseBounds(boundsValue);
const layers = option('layers', DEFAULT_LAYERS.join(',')).split(',');
const output = path.resolve(option('output', 'build/maps/tiles'));
const cache = path.resolve(option('cache', '.cache/maps/natural-earth'));
const jobs = Math.max(
  1,
  Number(option('jobs', Math.min(8, availableParallelism() - 1))),
);
const maximumTileKiB = Number(option('max-tile-kib', '24'));
const maximumTileBytes = maximumTileKiB * 1024;
const bundleFrom = Number(option('bundle-from', '6'));
const bundleSize = Number(option('bundle-size', '4'));
const [force, planOnly, extend] = ['force', 'plan', 'extend'].map(has);

const existingManifest = await readTileManifest(output);
let previousManifest = null;
if (extend) {
  if (zoom.minimum !== zoom.maximum) {
    throw new Error('An extended build must target exactly one zoom level.');
  }
  if (!existingManifest) {
    throw new Error('An extended build requires an existing tile manifest.');
  }
  previousManifest = existingManifest;
  if (previousManifest.zoom?.maximum !== zoom.minimum - 1) {
    throw new Error('The existing manifest must end at the parent zoom level.');
  }
}

if (!Number.isInteger(jobs)) throw new Error('Jobs must be an integer.');
if (!Number.isFinite(maximumTileKiB) || maximumTileKiB <= 0) {
  throw new Error('Maximum tile size must be a positive number.');
}
if (!Number.isInteger(bundleFrom) || bundleFrom < 0) {
  throw new Error('Bundle start zoom must be a non-negative integer.');
}
if (!Number.isInteger(bundleSize) || bundleSize < 1) {
  throw new Error('Bundle size must be a positive integer.');
}
if (!extend && zoom.maximum >= 10 && boundsValue === 'world') {
  throw new Error(
    'Worldwide builds at zoom 10 or higher require explicit --bounds.',
  );
}
for (const layer of layers) {
  if (!MAP_SOURCES[layer]) throw new Error(`Unknown map layer: ${layer}`);
}

const plan = extend
  ? createChildTilePlan(previousManifest.tileAvailability, zoom.minimum - 1)
  : createTilePlan({ zoom, bounds });
const bundleLevels = Object.fromEntries(
  plan.levels
    .filter((level) => level.zoom >= bundleFrom && bundleSize > 1)
    .map((level) => [level.zoom, bundleSize]),
);
const estimate = estimateTileOutput({
  plan,
  bundleLevels,
  manifest: existingManifest,
});
reportTilePlan({
  zoom,
  bounds: boundsValue,
  layers,
  maximumTileBytes,
  bundleLevels,
  bundleSize,
  plan,
  estimate,
});
if (planOnly) process.exit(0);

const sources = await Promise.all(
  layers.map((name) =>
    obtainMapSource({
      name,
      source: MAP_SOURCES[name],
      cache,
      formatBytes,
    }),
  ),
);
const sourceFiles = sources.map(({ name, path: sourcePath }) => ({
  name,
  path: sourcePath,
  minimumZoom: MAP_SOURCES[name].minimumZoom,
  maximumZoom: MAP_SOURCES[name].maximumZoom,
  featureFilter: MAP_SOURCES[name].featureFilter,
}));
const started = Date.now();
let completed = 0;
let written = 0;
let retained = 0;
let available = 0;
let bytes = 0;
let nextTile = 0;
let bytesBeforeSimplification = 0;
const levels = new Map();
const tileAvailability = new Map();
const bundledTiles = [];

async function saveResult({ tile, svg, tolerance, originalBytes }) {
  const current = ++completed;
  const directory = path.join(output, String(tile.zoom), String(tile.x));
  const destination = path.join(directory, `${tile.y}.svg`);
  if (svg) {
    addAvailableTile(tileAvailability, tile);
    if (bundleLevels[tile.zoom]) bundledTiles.push({ tile, svg });
    let existing = null;
    if (!bundleLevels[tile.zoom]) {
      try {
        existing = await stat(destination);
      } catch {
        // A missing destination is expected on the first build.
      }
      if (force || !existing) {
        await mkdir(directory, { recursive: true });
        await writeFile(`${destination}.tmp`, svg);
        await rename(`${destination}.tmp`, destination);
        written += 1;
        bytes += Buffer.byteLength(svg);
      } else {
        bytes += existing.size;
        retained += 1;
      }
    }
    available += 1;
    bytesBeforeSimplification += originalBytes;
    const level = levels.get(tile.zoom) ?? {
      tiles: 0,
      bytes: 0,
      simplified: 0,
      largestTileBytes: 0,
    };
    const tileBytes = Buffer.byteLength(svg);
    level.tiles += 1;
    level.bytes += tileBytes;
    level.simplified += tolerance > 0.45 ? 1 : 0;
    level.largestTileBytes = Math.max(level.largestTileBytes, tileBytes);
    levels.set(tile.zoom, level);
  } else if (force) {
    await rm(destination, { force: true });
  }
  const interval = Math.max(1, Math.floor(plan.tiles.length / 100));
  if (current % interval === 0 || current === plan.tiles.length) {
    const elapsed = (Date.now() - started) / 1000;
    process.stdout.write(progressText(current, plan.tiles.length, elapsed));
  }
}

function runWorker() {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./tile-worker.mjs', import.meta.url), {
      workerData: { sources: sourceFiles, maximumTileBytes },
    });
    worker.on('message', async (result) => {
      try {
        await saveResult(result);
        if (nextTile >= plan.tiles.length) {
          await worker.terminate();
          resolve();
          return;
        }
        worker.postMessage(plan.tiles[nextTile++]);
      } catch (error) {
        reject(error);
      }
    });
    worker.on('error', reject);
    if (nextTile < plan.tiles.length) {
      worker.postMessage(plan.tiles[nextTile++]);
    } else {
      worker.terminate().then(resolve, reject);
    }
  });
}

await mkdir(output, { recursive: true });
await Promise.all(
  Array.from({ length: Math.min(jobs, plan.tiles.length) }, runWorker),
);
const bundleSummary = await writeTileBundles({
  output,
  tiles: bundledTiles,
  levels: bundleLevels,
});
bytes += bundleSummary.bytes;
written += bundleSummary.bundles;
for (const [levelZoom, bundleLevel] of Object.entries(bundleSummary.levels)) {
  const level = levels.get(Number(levelZoom));
  level.sourceBytes = level.bytes;
  level.bytes = bundleLevel.bytes;
  level.bundles = bundleLevel.bundles;
}
process.stdout.write('\n');
const currentLevels = Object.fromEntries(
  [...levels].sort(([left], [right]) => left - right),
);
for (const level of plan.levels) {
  if (currentLevels[level.zoom]) {
    currentLevels[level.zoom].candidates = level.tiles;
  }
}
const manifest = createTileManifest({
  previous: previousManifest,
  levels: currentLevels,
  availability: serializeTileAvailability(tileAvailability),
  bundleLevels,
  current: {
    generatedAt: new Date().toISOString(),
    zoom,
    bounds,
    layers,
    candidates: plan.tiles.length,
    writtenThisRun: written,
    bytesBeforeSimplification,
    maximumTileBytes,
    attribution: SOURCE_ATTRIBUTION,
    sources: sources.map(({ name, source }) => ({
      name,
      url: source.url,
      file: source.file,
    })),
  },
});
await writeFile(
  path.join(output, 'manifest.json'),
  `${JSON.stringify(manifest, null, 2)}\n`,
);
const elapsed = (Date.now() - started) / 1000;
reportBuildSummary({
  completed,
  available,
  written,
  retained,
  bytes,
  elapsed,
});
