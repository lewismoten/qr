import { getFallbackTile } from '../tile-fallback.js';
import { setTileDebugCoordinates } from '../data/tile-debug.js';
import { renderMvt } from '../mvt/mvt-renderer.js';
import { TILE_SIZE } from '../projection.js';

const BACKGROUND_LAYERS = ['land', 'urban', 'water'];
const BACKGROUND_MAXIMUM_ZOOM = 10;
const TILE_TONE_COUNT = 4;

function sameTile(left, right) {
  return (
    left?.zoom === right?.zoom && left?.x === right?.x && left?.y === right?.y
  );
}

export async function findPmtilesTile({
  source,
  tile,
  minSourceZoom,
  maxSourceZoom,
}) {
  let sourceZoom = Math.min(tile.zoom, maxSourceZoom);
  while (sourceZoom >= minSourceZoom) {
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

export function getPmtilesStatusZoom(requestedZoom, maxSourceZoom, sourceTile) {
  if (!sourceTile) return -1;
  return requestedZoom <= maxSourceZoom ? requestedZoom : sourceTile.zoom;
}

export function createPmtilesTile({
  source,
  tile,
  minSourceZoom,
  maxSourceZoom,
  coverageMaxZoom = maxSourceZoom,
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
  const tone =
    (((tile.x + tile.y) % TILE_TONE_COUNT) + TILE_TONE_COUNT) % TILE_TONE_COUNT;
  element.classList.add(`tile-tone-${tone}`);
  element.slippySourceZoom = Math.min(tile.zoom, maxSourceZoom);
  element.slippyStatusSourceZoom = Math.min(tile.zoom, coverageMaxZoom);

  const unavailable = () => {
    element.slippyStatusSourceZoom = -1;
    onSourceChange?.();
    onUnavailable();
  };

  element.slippyReady = findPmtilesTile({
    source,
    tile,
    maxSourceZoom,
    minSourceZoom,
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
        coverageMaxZoom,
        sourceTile,
      );
      setTileDebugCoordinates(element, {
        wanted: tile,
        shown: sourceTile,
        fallback,
      });
      element.classList.toggle('is-fallback', fallback);
      onSourceChange?.(sourceTile.zoom);
      let background = null;
      if (sourceTile.zoom > BACKGROUND_MAXIMUM_ZOOM) {
        background = await findPmtilesTile({
          source,
          tile,
          minSourceZoom,
          maxSourceZoom: BACKGROUND_MAXIMUM_ZOOM,
        });
      }
      let parent = null;
      if (sourceTile.zoom >= compositeMinimumZoom) {
        parent = await findPmtilesTile({
          source,
          tile,
          minSourceZoom,
          maxSourceZoom: sourceTile.zoom - 1,
        });
      }
      if (background) {
        renderMvt(background.bytes, canvas, {
          zoom: tile.zoom,
          viewport: background.sourceTile,
          includeLayers: BACKGROUND_LAYERS,
        });
      }
      if (parent && sameTile(parent.sourceTile, background?.sourceTile)) {
        parent = null;
      }
      if (parent) {
        renderMvt(parent.bytes, canvas, {
          zoom: tile.zoom,
          viewport: parent.sourceTile,
          clear: !background,
        });
      }
      renderMvt(bytes, canvas, {
        zoom: tile.zoom,
        viewport: sourceTile,
        clear: !parent && !background,
      });
      element.classList.add('is-loaded');
      onLoad();
    })
    .catch(unavailable);
  return element;
}
