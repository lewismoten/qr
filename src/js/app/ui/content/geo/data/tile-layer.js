import { setTileLayerCoverage } from '../interaction/tile-transition.js';
import { getVisibleTileRange } from './tile-range.js';
import { getTileLod } from './tile-lod.js';
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
  minSourceZoom,
  maxSourceZoom,
  hasSourceTile,
  getTileBundle,
  origin,
  onFallbackChange,
  viewportBounds,
  tileFactory,
}) {
  const range = getVisibleTileRange({
    center,
    width,
    height,
    zoom,
    scale,
    viewportBounds,
  });
  const detailRange = getVisibleTileRange({
    center,
    width,
    height,
    zoom,
    scale,
    padding: 0,
    viewportBounds,
  });
  const visible = new Set();
  const syncFallback = () => {
    const sourceZoom = [...visible].reduce((lowest, key) => {
      const element = tiles.get(key);
      const sourceZoom =
        element?.slippyStatusSourceZoom ?? element?.slippySourceZoom;
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
      visible.add(
        getTileLod({
          lastY: detailRange.lastY,
          maxSourceZoom,
          minSourceZoom,
          x,
          y,
          zoom,
        }).key,
      );
    }
  }
  setTileLayerCoverage(layer, visible, tiles);
  for (let y = range.lastY; y >= range.firstY; y -= 1) {
    for (let x = range.firstX; x <= range.lastX; x += 1) {
      const lod = getTileLod({
        lastY: detailRange.lastY,
        maxSourceZoom,
        minSourceZoom,
        x,
        y,
        zoom,
      });
      renderTile({
        tiles,
        key: lod.key,
        layer,
        template,
        tile: { zoom, x, y },
        minSourceZoom,
        maxSourceZoom: lod.sourceZoom,
        hasSourceTile,
        getTileBundle,
        origin,
        tileFactory,
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
