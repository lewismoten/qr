import { access, cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

export async function publishDetailedMap({
  outputRoot,
  archive = 'build/maps/local.pmtiles',
  legacyTiles = 'build/maps/tiles',
}) {
  const maps = path.join(outputRoot, 'maps');
  await mkdir(maps, { recursive: true });
  if (await exists(archive)) {
    await rm(path.join(maps, 'tiles'), { recursive: true, force: true });
    await cp(archive, path.join(maps, 'local.pmtiles'));
    return 'pmtiles';
  }
  if (await exists(legacyTiles)) {
    await cp(legacyTiles, path.join(maps, 'tiles'), { recursive: true });
    return 'svg';
  }
  return null;
}
