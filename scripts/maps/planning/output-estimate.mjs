import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { formatBytes } from '../tile-plan.mjs';

const HISTORICAL_MINIMUM_RATIO = 0.8;
const HISTORICAL_MAXIMUM_RATIO = 1.25;
const PARENT_MINIMUM_RATIO = 0.55;
const PARENT_MAXIMUM_RATIO = 1.15;
const KIBIBYTE = 1024;
const FALLBACK_MINIMUM_KIB = 4;
const FALLBACK_MAXIMUM_KIB = 12;
const SECONDS_PER_MINUTE = 60;
const PERCENT_SCALE = 100;

export async function readTileManifest(output) {
  try {
    return JSON.parse(
      await readFile(path.join(output, 'manifest.json'), 'utf8'),
    );
  } catch {
    return null;
  }
}

function outputFilesByZoom(plan, bundleLevels) {
  const counts = new Map();
  const bundles = new Map();
  for (const tile of plan.tiles) {
    const size = bundleLevels[tile.zoom];
    if (!size) {
      counts.set(tile.zoom, (counts.get(tile.zoom) ?? 0) + 1);
      continue;
    }
    const level = bundles.get(tile.zoom) ?? new Set();
    level.add(`${Math.floor(tile.x / size)}:${Math.floor(tile.y / size)}`);
    bundles.set(tile.zoom, level);
  }
  for (const [zoom, groups] of bundles) counts.set(zoom, groups.size);
  return counts;
}

function historicalEstimate(level, files, candidates) {
  if (!level?.bytes) return null;
  const scale = level.candidates ? candidates / level.candidates : 1;
  return {
    minimum: level.bytes * scale * HISTORICAL_MINIMUM_RATIO,
    maximum: level.bytes * scale * HISTORICAL_MAXIMUM_RATIO,
    files,
    basis: 'previous output at the same level',
  };
}

function parentEstimate(parent, files) {
  if (!parent?.bytes) return null;
  const parentFiles = parent.bundles ?? parent.tiles;
  if (!parentFiles) return null;
  const average = parent.bytes / parentFiles;
  return {
    minimum: files * average * PARENT_MINIMUM_RATIO,
    maximum: files * average * PARENT_MAXIMUM_RATIO,
    files,
    basis: 'parent-level output density',
  };
}

function fallbackEstimate(files) {
  return {
    minimum: files * FALLBACK_MINIMUM_KIB * KIBIBYTE,
    maximum: files * FALLBACK_MAXIMUM_KIB * KIBIBYTE,
    files,
    basis: 'bundle-aware first-build range',
  };
}

export function estimateTileOutput({ plan, bundleLevels, manifest }) {
  const filesByZoom = outputFilesByZoom(plan, bundleLevels);
  const estimates = plan.levels.map(({ zoom, tiles }) => {
    const files = filesByZoom.get(zoom) ?? 0;
    return (
      historicalEstimate(manifest?.levels?.[zoom], files, tiles) ??
      parentEstimate(manifest?.levels?.[zoom - 1], files) ??
      fallbackEstimate(files)
    );
  });
  const bases = new Set(estimates.map(({ basis }) => basis));
  return {
    minimum: estimates.reduce((total, item) => total + item.minimum, 0),
    maximum: estimates.reduce((total, item) => total + item.maximum, 0),
    files: estimates.reduce((total, item) => total + item.files, 0),
    basis: [...bases].join('; '),
  };
}

export function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds < 1) return '<1s';
  if (seconds < SECONDS_PER_MINUTE) return `${Math.ceil(seconds)}s`;
  const minutes = Math.floor(seconds / SECONDS_PER_MINUTE);
  const remainder = Math.ceil(seconds % SECONDS_PER_MINUTE);
  return `${minutes}m ${remainder}s`;
}

export function reportTilePlan({
  zoom,
  bounds,
  layers,
  maximumTileBytes,
  bundleLevels,
  bundleSize,
  plan,
  estimate,
}) {
  console.log(`Zoom: ${zoom.minimum}-${zoom.maximum}`);
  console.log(`Bounds: ${bounds}`);
  console.log(`Layers: ${layers.join(', ')}`);
  console.log(`Target maximum: ${formatBytes(maximumTileBytes)} per tile`);
  console.log(
    `Bundles: ${Object.keys(bundleLevels).join(', ') || 'none'} ` +
      `(${bundleSize}x${bundleSize})`,
  );
  for (const level of plan.levels) {
    console.log(`  z${level.zoom}: ${level.tiles.toLocaleString()} tiles`);
  }
  console.log(`Candidate tiles: ${plan.tiles.length.toLocaleString()}`);
  console.log(
    `Estimated bundled output: ${formatBytes(estimate.minimum)}–` +
      `${formatBytes(estimate.maximum)} across at most ` +
      `${estimate.files.toLocaleString()} files`,
  );
  console.log(`Estimate basis: ${estimate.basis}.`);
}

export function progressText(current, total, elapsed) {
  const remaining = (elapsed / current) * (total - current);
  return (
    `\r${Math.floor((current / total) * PERCENT_SCALE)}% ` +
    `${current}/${total} | ` +
    `ETA ${formatDuration(remaining)}\x1b[K`
  );
}

export function reportBuildSummary({
  completed,
  available,
  written,
  retained,
  bytes,
  elapsed,
}) {
  const empty = completed - available;
  console.log(
    `${completed.toLocaleString()} candidates: ` +
      `${available.toLocaleString()} non-empty, ` +
      `${empty.toLocaleString()} empty.`,
  );
  console.log(
    `${written.toLocaleString()} output files written` +
      `${retained ? `; ${retained.toLocaleString()} retained` : ''}; ` +
      `${formatBytes(bytes)} in ${formatDuration(elapsed)} ` +
      `(${Math.round(completed / elapsed).toLocaleString()} tiles/s).`,
  );
}
