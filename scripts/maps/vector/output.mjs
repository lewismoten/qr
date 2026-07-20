import { open, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { scanArchiveTileStatistics } from './pmtiles/archive-statistics.mjs';

const PMTILES_MAGIC = 'PMTiles';
const PMTILES_STATS_BYTES = 96;

export function temporaryArchivePath(output) {
  const parsed = path.parse(output);
  return path.join(parsed.dir, `${parsed.name}.partial${parsed.ext}`);
}

export function smallestArchivePath(output) {
  const parsed = path.parse(output);
  return path.join(parsed.dir, `${parsed.name}.smallest${parsed.ext}`);
}

export async function validatePmtilesArchive(file, maximumBytes) {
  const handle = await open(file, 'r');
  try {
    const bytes = Buffer.alloc(8);
    await handle.read(bytes, 0, bytes.length, 0);
    if (bytes.subarray(0, 7).toString() !== PMTILES_MAGIC || bytes[7] !== 3) {
      throw new Error('Tippecanoe did not produce a PMTiles v3 archive.');
    }
  } finally {
    await handle.close();
  }
  const { size } = await stat(file);
  if (size > maximumBytes) {
    throw new Error(
      `Map archive is ${(size / 1024 / 1024).toFixed(1)} MiB; ` +
        `the budget is ${maximumBytes / 1024 / 1024} MiB.`,
    );
  }
  return size;
}

export async function readPmtilesArchiveStats(file, maximumTileBytes) {
  const handle = await open(file, 'r');
  try {
    const bytes = Buffer.alloc(PMTILES_STATS_BYTES);
    const { bytesRead } = await handle.read(bytes, 0, bytes.length, 0);
    if (bytesRead < bytes.length) {
      throw new Error('PMTiles header is incomplete.');
    }
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const tileDataBytes = Number(view.getBigUint64(64, true));
    const addressedTiles = Number(view.getBigUint64(72, true));
    const tileEntries = Number(view.getBigUint64(80, true));
    const tileContents = Number(view.getBigUint64(88, true));
    return {
      tileDataBytes,
      addressedTiles,
      tileEntries,
      tileContents,
      averageStoredTileBytes: tileContents
        ? Math.round(tileDataBytes / tileContents)
        : 0,
      ...(await scanArchiveTileStatistics(handle, maximumTileBytes)),
    };
  } finally {
    await handle.close();
  }
}

export async function removeStaleArchives(manifestFile, currentFiles) {
  let manifest;
  try {
    manifest = JSON.parse(await readFile(manifestFile, 'utf8'));
  } catch {
    return;
  }
  const directory = path.dirname(manifestFile);
  const keep = new Set(currentFiles.map((file) => path.basename(file)));
  const stale = manifest.archives
    .map((archive) => path.basename(archive.file))
    .filter((file) => !keep.has(file));
  await Promise.all(
    stale.map((file) => rm(path.join(directory, file), { force: true })),
  );
}

export async function writeArchiveManifest({
  manifestFile,
  results,
  minimumZoom,
  maximumZoom,
  maximumArchiveMiB,
  totalBytes,
  overageBytes,
}) {
  const manifest = {
    version: 1,
    minimumZoom,
    maximumZoom,
    maximumArchiveMiB,
    totalBytes,
    overageBytes,
    overBudget: overageBytes > 0,
    archives: results.map((result) => ({
      minimumZoom: result.minimumZoom,
      maximumZoom: result.maximumZoom,
      shard: result.shard,
      shardGrid: result.shardGrid,
      shardColumn: result.shardColumn,
      shardRow: result.shardRow,
      bounds: result.bounds,
      file: path.basename(result.file),
      bytes: result.bytes,
      plannedBudgetBytes: result.budgetBytes,
      allocatedBudgetBytes: result.allocatedBudgetBytes,
      carryBytes: result.carryBytes,
      maximumTileBytes: result.maximumTileBytes,
      detail: result.detail,
      archiveStats: result.archiveStats,
    })),
  };
  await removeStaleArchives(
    manifestFile,
    results.map((result) => result.file),
  );
  const temporary = `${manifestFile}.partial`;
  await writeFile(temporary, `${JSON.stringify(manifest, null, 2)}\n`);
  await rename(temporary, manifestFile);
}
