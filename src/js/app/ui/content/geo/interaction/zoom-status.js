import { lookup } from '../../../../../i18n/index.js';
import { createElement } from '../slippy-elements.js';

export function getZoomStatus(viewLayer, scale) {
  const zoom = viewLayer + Math.log2(scale);
  const lower = Math.floor(zoom);
  const upper = lower + 1;
  const percent = Math.round((zoom - lower) * 100);
  return {
    emptying: lower % 2 === 0,
    lower,
    percent,
    upper,
    zoom: zoom.toFixed(2),
  };
}

export function createZoomChrome(onTileOverlayChange = () => {}) {
  const controls = createElement('div', 'slippy-map-controls', {
    'aria-label': lookup('map.zoomControls', 'Map zoom controls'),
  });
  const zoomIn = createElement('button', 'slippy-map-control', {
    type: 'button',
    'aria-label': lookup('map.zoomIn', 'Zoom in'),
  });
  const zoomOut = createElement('button', 'slippy-map-control', {
    type: 'button',
    'aria-label': lookup('map.zoomOut', 'Zoom out'),
  });
  zoomIn.textContent = '+';
  zoomOut.textContent = '-';
  const status = createElement('div', 'slippy-map-zoom-status');
  const layer = createElement('button', 'slippy-map-zoom-layer', {
    type: 'button',
    'aria-pressed': 'false',
  });
  let tileOverlay = false;
  layer.addEventListener('click', () => {
    tileOverlay = !tileOverlay;
    layer.setAttribute('aria-pressed', String(tileOverlay));
    status.classList.toggle('has-tile-overlay', tileOverlay);
    onTileOverlayChange(tileOverlay);
  });
  status.append(layer);
  controls.append(zoomIn, status, zoomOut);

  const update = (viewLayer, scale, sourceZoom = viewLayer) => {
    const value = getZoomStatus(viewLayer, scale);
    const fallback = Number.isInteger(sourceZoom) && sourceZoom < value.lower;
    layer.textContent = value.lower;
    status.className =
      'slippy-map-zoom-status' +
      (value.emptying ? ' is-emptying' : '') +
      (fallback ? ' is-fallback' : '') +
      (tileOverlay ? ' has-tile-overlay' : '');
    status.style.setProperty('--slippy-zoom-progress', `${value.percent}%`);
    status.setAttribute(
      'aria-label',
      lookup(
        'map.zoomProgress',
        'Layer {layer}; zoom {zoom}; {percent}% from level {lower} to {upper}.',
        {
          layer: value.lower,
          lower: value.lower,
          percent: value.percent,
          upper: value.upper,
          zoom: value.zoom,
        },
      ) +
        (fallback
          ? ` ${lookup(
              'map.zoomFallback',
              'Some visible map tiles are enlarged from an earlier layer.',
            )}`
          : ''),
    );
    layer.setAttribute(
      'aria-label',
      lookup(
        tileOverlay ? 'map.tileOverlayHide' : 'map.tileOverlayShow',
        tileOverlay ? 'Hide map tile boundaries' : 'Show map tile boundaries',
      ),
    );
  };

  return { controls, status, update, zoomIn, zoomOut };
}
