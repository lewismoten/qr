import { pointFeatures } from './city-layer.mjs';

export function renderProtectedPoints(collections, tile, project, tileSize) {
  return pointFeatures(collections, 'protectedPoints', tile, project, tileSize)
    .map((feature) => {
      const [x, y] = project(feature.geometry.coordinates, tile.zoom);
      const localX = x - tile.x * tileSize;
      const localY = y - tile.y * tileSize;
      return (
        `<circle class="protected-point" cx="${localX.toFixed(1)}" ` +
        `cy="${localY.toFixed(1)}" r="1.5"/>`
      );
    })
    .join('');
}
