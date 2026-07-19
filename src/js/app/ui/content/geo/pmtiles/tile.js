import { getFallbackTile } from '../tile-fallback.js';
import { renderMvt } from '../mvt/render.js';
import { TILE_SIZE } from '../projection.js';

export function createPmtilesTile({
  source,
  tile,
  maximumSourceZoom,
  onLoad = () => {},
  onUnavailable = () => {},
  onSourceChange,
}) {
  const element = document.createElement('canvas');
  const sourceZoom = Math.min(tile.zoom, maximumSourceZoom);
  const sourceTile = getFallbackTile(tile, sourceZoom);
  const scale = sourceTile.scale;
  element.className = 'slippy-map-tile slippy-map-vector-tile';
  element.width = TILE_SIZE;
  element.height = TILE_SIZE;
  element.slippySourceZoom = sourceZoom;
  element.dataset.wanted = `z${tile.zoom}/${tile.x}/${tile.y}`;
  element.dataset.shown = `z${sourceTile.zoom}/${sourceTile.x}/${sourceTile.y}`;
  element.classList.toggle('is-fallback', sourceZoom < tile.zoom);
  onSourceChange?.(sourceZoom);

  source
    .getTile(sourceTile.zoom, sourceTile.x, sourceTile.y)
    .then((bytes) => {
      if (!bytes) {
        onUnavailable();
        return;
      }
      if (scale === 1) renderMvt(bytes, element);
      else {
        const parent = document.createElement('canvas');
        parent.width = TILE_SIZE;
        parent.height = TILE_SIZE;
        renderMvt(bytes, parent);
        const context = element.getContext('2d');
        context.imageSmoothingEnabled = true;
        context.drawImage(
          parent,
          -sourceTile.offsetX * TILE_SIZE,
          -sourceTile.offsetY * TILE_SIZE,
          TILE_SIZE * scale,
          TILE_SIZE * scale,
        );
      }
      element.classList.add('is-loaded');
      onLoad();
    })
    .catch(() => onUnavailable());
  return element;
}
