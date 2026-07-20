import { getFallbackTile } from '../tile-fallback.js';
import { setTileDebugCoordinates } from '../data/tile-debug.js';
import { renderMvt } from '../mvt/mvt-renderer.js';
import { TILE_SIZE } from '../projection.js';

export async function findPmtilesTile({
  source,
  tile,
  minimumSourceZoom,
  maximumSourceZoom,
}) {
  let sourceZoom = Math.min(tile.zoom, maximumSourceZoom);
  while (sourceZoom >= minimumSourceZoom) {
    const sourceTile = getFallbackTile(tile, sourceZoom);
    const bytes = await source.getTile(
      sourceTile.zoom,
      sourceTile.x,
      sourceTile.y,
    );
    if (bytes) return { bytes, sourceTile };
    sourceZoom -= 1;
  }
  return null;
}

export function getPmtilesStatusZoom(
  requestedZoom,
  maximumSourceZoom,
  sourceTile,
) {
  if (!sourceTile) return -1;
  return requestedZoom <= maximumSourceZoom ? requestedZoom : sourceTile.zoom;
}

export function createPmtilesTile({
  source,
  tile,
  minimumSourceZoom,
  maximumSourceZoom,
  coverageMaximumZoom = maximumSourceZoom,
  compositeMinimumZoom = 17,
  onLoad = () => {},
  onUnavailable = () => {},
  onSourceChange,
}) {
  const element = document.createElement('div');
  const canvas = document.createElement('canvas');
  element.className = 'slippy-map-tile';
  canvas.className = 'slippy-map-vector-tile';
  canvas.width = TILE_SIZE;
  canvas.height = TILE_SIZE;
  element.append(canvas);
  const tone = (((tile.x + tile.y) % 4) + 4) % 4;
  element.classList.add(`tile-tone-${tone}`);
  element.slippySourceZoom = Math.min(tile.zoom, maximumSourceZoom);
  element.slippyStatusSourceZoom = Math.min(tile.zoom, coverageMaximumZoom);

  const unavailable = () => {
    element.slippyStatusSourceZoom = -1;
    onSourceChange?.();
    onUnavailable();
  };

  findPmtilesTile({
    source,
    tile,
    maximumSourceZoom,
    minimumSourceZoom,
  })
    .then(async (result) => {
      if (!result) {
        unavailable();
        return;
      }
      const { bytes, sourceTile } = result;
      const fallback = sourceTile.zoom < tile.zoom;
      element.slippySourceZoom = sourceTile.zoom;
      element.slippyStatusSourceZoom = getPmtilesStatusZoom(
        tile.zoom,
        coverageMaximumZoom,
        sourceTile,
      );
      setTileDebugCoordinates(element, {
        wanted: tile,
        shown: sourceTile,
        fallback,
      });
      element.classList.toggle('is-fallback', fallback);
      onSourceChange?.(sourceTile.zoom);
      let parent = null;
      if (sourceTile.zoom >= compositeMinimumZoom) {
        parent = await findPmtilesTile({
          source,
          tile,
          minimumSourceZoom,
          maximumSourceZoom: sourceTile.zoom - 1,
        });
      }
      if (parent) {
        renderMvt(parent.bytes, canvas, {
          zoom: tile.zoom,
          viewport: parent.sourceTile,
        });
      }
      renderMvt(bytes, canvas, {
        zoom: tile.zoom,
        viewport: sourceTile,
        clear: !parent,
      });
      element.classList.add('is-loaded');
      onLoad();
    })
    .catch(unavailable);
  return element;
}
