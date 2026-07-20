import { open, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { scanArchiveTileStatistics } from './pmtiles/archive-statistics.mjs';

const PMTILES_MAGIC = 'PMTiles';
const PMTILES_STATS_BYTES = 96;
const PMTILES_PREFIX_BYTES = 8;
const PMTILES_MAGIC_BYTES = 7;
const PMTILES_VERSION_OFFSET = 7;
const PMTILES_VERSION = 3;
const KIBIBYTE = 1024;
const MEBIBYTE = KIBIBYTE * KIBIBYTE;
const HEADER_OFFSETS = {
  tileDataBytes: 64,
  addressedTiles: 72,
  tileEntries: 80,
  tileContents: 88,
};

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
    const bytes = Buffer.alloc(PMTILES_PREFIX_BYTES);
    await handle.read(bytes, 0, bytes.length, 0);
    const validMagic =
      bytes.subarray(0, PMTILES_MAGIC_BYTES).toString() === PMTILES_MAGIC;
    if (!validMagic || bytes[PMTILES_VERSION_OFFSET] !== PMTILES_VERSION) {
      throw new Error('Tippecanoe did not produce a PMTiles v3 archive.');
    }
  } finally {
    await handle.close();
  }
  const { size } = await stat(file);
  if (size > maximumBytes) {
    throw new Error(
      `Map archive is ${(size / MEBIBYTE).toFixed(1)} MiB; ` +
        `the budget is ${maximumBytes / MEBIBYTE} MiB.`,
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
    const tileDataBytes = Number(
      view.getBigUint64(HEADER_OFFSETS.tileDataBytes, true),
    );
    const addressedTiles = Number(
      view.getBigUint64(HEADER_OFFSETS.addressedTiles, true),
    );
    const tileEntries = Number(
      view.getBigUint64(HEADER_OFFSETS.tileEntries, true),
    );
    const tileContents = Number(
      view.getBigUint64(HEADER_OFFSETS.tileContents, true),
    );
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
      naturalBytes: result.naturalBytes,
      retainedRatio: result.retainedRatio,
      plannedBudgetBytes: result.budgetBytes,
      allocatedBudgetBytes: result.allocatedBudgetBytes,
      carryBytes: result.carryBytes,
      maximumTileBytes: result.maximumTileBytes,
      detail: result.detail,
      archiveStats: result.archiveStats,
      naturalArchiveStats: result.naturalArchiveStats,
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
