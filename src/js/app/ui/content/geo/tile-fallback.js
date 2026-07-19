import { TILE_SIZE } from './projection.js';

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
  onLoad = () => {},
  onUnavailable,
}) {
  const element = document.createElement('div');
  const image = document.createElement('img');
  let sourceZoom = Math.min(tile.zoom, maximumSourceZoom);
  element.className = 'slippy-map-tile';
  image.className = 'slippy-map-tile-source';
  image.alt = '';
  image.draggable = false;
  image.decoding = 'async';
  image.referrerPolicy = 'strict-origin-when-cross-origin';
  element.appendChild(image);

  const load = () => {
    const source = getFallbackTile(tile, sourceZoom);
    const size = TILE_SIZE * source.scale;
    image.style.width = `${size}px`;
    image.style.height = `${size}px`;
    image.style.left = `${-source.offsetX * TILE_SIZE}px`;
    image.style.top = `${-source.offsetY * TILE_SIZE}px`;
    image.src = tileUrl(template, source);
  };
  image.addEventListener('error', () => {
    if (sourceZoom > minimumSourceZoom) {
      sourceZoom -= 1;
      load();
    } else {
      element.classList.add('is-missing');
      onUnavailable?.();
    }
  });
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
    return { minimum, maximum };
  } catch {
    return DEFAULT_RANGE;
  }
}
