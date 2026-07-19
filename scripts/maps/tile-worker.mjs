import { readFile } from 'node:fs/promises';
import { parentPort, workerData } from 'node:worker_threads';

import {
  prepareCollections,
  renderTileWithinSize,
} from './rendering/tile-renderer.mjs';

const collections = prepareCollections(
  Object.fromEntries(
    await Promise.all(
      workerData.sources.map(
        async ({ name, path, minimumZoom, maximumZoom, featureFilter }) => [
          name,
          {
            collection: JSON.parse(await readFile(path, 'utf8')),
            minimumZoom,
            maximumZoom,
            featureFilter,
          },
        ],
      ),
    ),
  ),
);

parentPort.on('message', (tile) => {
  parentPort.postMessage({
    tile,
    ...renderTileWithinSize(tile, collections, workerData.maximumTileBytes),
  });
});
