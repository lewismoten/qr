import { readFile } from 'node:fs/promises';
import { parentPort, workerData } from 'node:worker_threads';

import { prepareCollections, renderTile } from './tile-renderer.mjs';

const collections = prepareCollections(
  Object.fromEntries(
    await Promise.all(
      workerData.sources.map(
        async ({ name, path, minimumZoom, maximumZoom }) => [
          name,
          {
            collection: JSON.parse(await readFile(path, 'utf8')),
            minimumZoom,
            maximumZoom,
          },
        ],
      ),
    ),
  ),
);

parentPort.on('message', (tile) => {
  parentPort.postMessage({ tile, svg: renderTile(tile, collections) });
});
