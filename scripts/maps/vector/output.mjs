import { open, readFile, rm, stat } from 'node:fs/promises';
import path from 'node:path';

const PMTILES_MAGIC = 'PMTiles';

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
