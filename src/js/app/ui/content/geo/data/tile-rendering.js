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
  hasSourceTile,
  getTileBundle,
  resolveTileSource,
  origin,
}) {
  let element = tiles.get(key);
  if (!element) {
    const settle = () => {
      element.slippyLoaded = true;
      layer.slippyPendingTiles?.delete(key);
      revealTileLayer(layer);
    };
    element = createFallbackTile({
      template,
      tile,
      minimumSourceZoom,
      maximumSourceZoom,
      hasSourceTile,
      getTileBundle,
      resolveTileSource,
      onLoad: settle,
      onUnavailable: settle,
    });
    tiles.set(key, element);
    layer.appendChild(element);
  }
  element.style.left = `${tile.x * TILE_SIZE - origin.x}px`;
  element.style.top = `${tile.y * TILE_SIZE - origin.y}px`;
  return element;
}
