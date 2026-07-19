import { revealTileLayer } from '../interaction/tile-transition.js';
import { createFallbackTile } from '../tile-fallback.js';
import { TILE_SIZE } from '../projection.js';

export function renderTile({
  tiles,
  key,
  layer,
  template,
  tile,
  minimumSourceZoom,
  maximumSourceZoom,
  origin,
}) {
  let element = tiles.get(key);
  if (!element) {
    element = createFallbackTile({
      template,
      tile,
      minimumSourceZoom,
      maximumSourceZoom,
      onLoad: () => revealTileLayer(layer),
    });
    tiles.set(key, element);
    layer.appendChild(element);
  }
  element.style.left = `${Math.round(tile.x * TILE_SIZE - origin.x)}px`;
  element.style.top = `${Math.round(tile.y * TILE_SIZE - origin.y)}px`;
  return element;
}
