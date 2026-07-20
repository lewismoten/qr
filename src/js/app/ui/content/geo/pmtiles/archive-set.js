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
      const archive = archives.find(
        (item) => zoom >= item.minimumZoom && zoom <= item.maximumZoom,
      );
      return archive ? archive.source.getTile(zoom, x, y) : null;
    },
  };
}
