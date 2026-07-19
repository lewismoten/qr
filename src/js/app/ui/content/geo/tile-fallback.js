import { TILE_SIZE } from './projection.js';
import { createTileAvailability } from './data/tile-availability.js';
import { createTileBundleResolver } from './data/tile-bundles.js';

const DEFAULT_RANGE = { minimum: 1, maximum: 6 };

export function getFallbackTile(tile, sourceZoom) {
  const tileCount = 2 ** tile.zoom;
  const wrappedX = ((tile.x % tileCount) + tileCount) % tileCount;
  const scale = 2 ** (tile.zoom - sourceZoom);
  return {
    zoom: sourceZoom,
    x: Math.floor(wrappedX / scale),
    y: Math.floor(tile.y / scale),
    scale,
    offsetX: wrappedX % scale,
    offsetY: tile.y % scale,
  };
}

function tileUrl(template, tile) {
  return template
    .replace('{z}', tile.zoom)
    .replace('{x}', tile.x)
    .replace('{y}', tile.y);
}

export function createFallbackTile({
  template,
  tile,
  minimumSourceZoom,
  maximumSourceZoom,
  hasSourceTile,
  getTileBundle,
  resolveTileSource,
  onLoad = () => {},
  onUnavailable,
}) {
  const element = document.createElement('div');
  const image = document.createElement('img');
  let sourceZoom = Math.min(tile.zoom, maximumSourceZoom);
  let request = 0;
  element.className = 'slippy-map-tile';
  image.className = 'slippy-map-tile-source';
  image.alt = '';
  image.draggable = false;
  image.decoding = 'async';
  image.referrerPolicy = 'strict-origin-when-cross-origin';
  element.appendChild(image);

  function useParent() {
    if (sourceZoom > minimumSourceZoom) {
      sourceZoom -= 1;
      load();
      return;
    }
    element.classList.add('is-missing');
    onUnavailable?.();
  }
  function load() {
    let source = getFallbackTile(tile, sourceZoom);
    while (hasSourceTile && !hasSourceTile(source)) {
      if (sourceZoom <= minimumSourceZoom) {
        element.classList.add('is-missing');
        onUnavailable?.();
        return;
      }
      sourceZoom -= 1;
      source = getFallbackTile(tile, sourceZoom);
    }
    const bundle = getTileBundle?.(source);
    const bundleSize = bundle?.size ?? 1;
    const size = TILE_SIZE * source.scale * bundleSize;
    const bundleX = (bundle?.offsetX ?? 0) * TILE_SIZE * source.scale;
    const bundleY = (bundle?.offsetY ?? 0) * TILE_SIZE * source.scale;
    image.style.width = `${size}px`;
    image.style.height = `${size}px`;
    image.style.left = `${-bundleX - source.offsetX * TILE_SIZE}px`;
    image.style.top = `${-bundleY - source.offsetY * TILE_SIZE}px`;
    const url = bundle?.url ?? tileUrl(template, source);
    const currentRequest = ++request;
    if (!resolveTileSource) {
      image.src = url;
      return;
    }
    resolveTileSource(url).then(
      (resolvedUrl) => {
        if (request === currentRequest) image.src = resolvedUrl;
      },
      () => {
        if (request === currentRequest) useParent();
      },
    );
  }
  image.addEventListener('error', useParent);
  image.addEventListener('load', () => {
    element.classList.add('is-loaded');
    onLoad();
  });
  load();
  return element;
}

export async function loadLocalTileRange(fetcher = globalThis.fetch) {
  if (!fetcher) return DEFAULT_RANGE;
  try {
    const response = await fetcher('/maps/tiles/manifest.json');
    if (!response.ok) return DEFAULT_RANGE;
    const manifest = await response.json();
    const minimum = Number(manifest.zoom?.minimum);
    const maximum = Number(manifest.zoom?.maximum);
    if (!Number.isInteger(minimum) || !Number.isInteger(maximum)) {
      return DEFAULT_RANGE;
    }
    const hasTile = createTileAvailability(manifest);
    const getTileBundle = createTileBundleResolver(manifest);
    return {
      minimum,
      maximum,
      ...(hasTile ? { hasTile } : {}),
      ...(getTileBundle ? { getTileBundle } : {}),
    };
  } catch {
    return DEFAULT_RANGE;
  }
}
