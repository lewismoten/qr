import { setTileLayerCoverage } from '../interaction/tile-transition.js';
import { getVisibleTileRange } from './tile-range.js';
import { renderTile } from './tile-rendering.js';

export function renderTileLayer({
  tiles,
  layer,
  template,
  zoom,
  center,
  width,
  height,
  scale,
  minimumSourceZoom,
  maximumSourceZoom,
  hasSourceTile,
  resolveTileSource,
  origin,
}) {
  const range = getVisibleTileRange({
    center,
    width,
    height,
    zoom,
    scale,
  });
  const visible = new Set();
  for (let y = range.firstY; y <= range.lastY; y += 1) {
    for (let x = range.firstX; x <= range.lastX; x += 1) {
      visible.add(`${zoom}:${x}:${y}`);
    }
  }
  setTileLayerCoverage(layer, visible, tiles);
  for (let y = range.firstY; y <= range.lastY; y += 1) {
    for (let x = range.firstX; x <= range.lastX; x += 1) {
      const key = `${zoom}:${x}:${y}`;
      renderTile({
        tiles,
        key,
        layer,
        template,
        tile: { zoom, x, y },
        minimumSourceZoom,
        maximumSourceZoom,
        hasSourceTile,
        resolveTileSource,
        origin,
      });
    }
  }
  tiles.forEach((element, key) => {
    if (visible.has(key)) return;
    element.remove();
    tiles.delete(key);
  });
}
