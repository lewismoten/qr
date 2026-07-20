import { access, cp, mkdir, readFile, readdir, rm } from 'node:fs/promises';
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
  manifest = 'build/maps/local.json',
  legacyTiles = 'build/maps/tiles',
}) {
  const maps = path.join(outputRoot, 'maps');
  await mkdir(maps, { recursive: true });
  if (await exists(manifest)) {
    const parsed = JSON.parse(await readFile(manifest, 'utf8'));
    await rm(path.join(maps, 'tiles'), { recursive: true, force: true });
    const oldArchives = (await readdir(maps)).filter((file) => {
      return /^local(?:-|\.pmtiles$)/.test(file) && file.endsWith('.pmtiles');
    });
    await Promise.all(
      oldArchives.map((file) => rm(path.join(maps, file), { force: true })),
    );
    for (const item of parsed.archives) {
      const source = path.join(path.dirname(manifest), item.file);
      await cp(source, path.join(maps, item.file));
    }
    await cp(manifest, path.join(maps, 'local.json'));
    return 'pmtiles-set';
  }
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
