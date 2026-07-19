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
  getTileBundle,
  origin,
  onFallbackChange,
}) {
  const range = getVisibleTileRange({
    center,
    width,
    height,
    zoom,
    scale,
  });
  const visible = new Set();
  const syncFallback = () => {
    const sourceZoom = [...visible].reduce((lowest, key) => {
      const sourceZoom = tiles.get(key)?.slippySourceZoom;
      return Number.isInteger(sourceZoom)
        ? Math.min(lowest, sourceZoom)
        : lowest;
    }, zoom);
    if (layer.slippySourceZoom !== sourceZoom) {
      layer.slippySourceZoom = sourceZoom;
      onFallbackChange?.(sourceZoom);
    }
  };
  layer.slippySourceChange = syncFallback;
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
        getTileBundle,
        origin,
      });
    }
  }
  tiles.forEach((element, key) => {
    if (visible.has(key)) return;
    element.remove();
    tiles.delete(key);
  });
  syncFallback();
}
