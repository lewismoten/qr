import { createPmtilesSource } from './source.js';

function validateManifest(manifest) {
  if (manifest?.version !== 1 || !Array.isArray(manifest.archives)) {
    throw new Error('Invalid PMTiles archive manifest.');
  }
  if (!manifest.archives.length) {
    throw new Error('The PMTiles archive manifest is empty.');
  }
  return manifest;
}

export function findArchiveForTile(archives, zoom, x, y) {
  const candidates = archives.filter((item) => {
    return zoom >= item.minimumZoom && zoom <= item.maximumZoom;
  });
  const wholeWorld = candidates.find((item) => !item.shard);
  if (wholeWorld) return wholeWorld;
  const middle = 2 ** (zoom - 1);
  const vertical = y < middle ? 'north' : 'south';
  const horizontal = x < middle ? 'west' : 'east';
  const shard = `${vertical}-${horizontal}`;
  return candidates.find((item) => item.shard === shard);
}

export async function createPmtilesArchiveSet(
  manifestUrl,
  {
    fetcher = globalThis.fetch,
    sourceFactory = createPmtilesSource,
    baseUrl = globalThis.location?.href || 'http://localhost/',
  } = {},
) {
  const response = await fetcher(manifestUrl, { cache: 'no-cache' });
  if (!response.ok) {
    throw new Error(`Unable to read PMTiles manifest: ${response.status}.`);
  }
  const manifest = validateManifest(await response.json());
  const resolvedManifest = new URL(manifestUrl, baseUrl);
  const archives = manifest.archives.map((archive) => ({
    ...archive,
    source: sourceFactory(new URL(archive.file, resolvedManifest).toString(), {
      fetcher,
    }),
  }));
  return {
    async getHeader() {
      return {
        minimumZoom: manifest.minimumZoom,
        maximumZoom: manifest.maximumZoom,
      };
    },
    async getTile(zoom, x, y) {
      const archive = findArchiveForTile(archives, zoom, x, y);
      return archive ? archive.source.getTile(zoom, x, y) : null;
    },
  };
}
