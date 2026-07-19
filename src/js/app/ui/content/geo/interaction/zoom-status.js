import { lookup } from '../../../../../i18n/index.js';
import { createElement } from '../slippy-elements.js';

export function getZoomStatus(viewLayer, scale, tileLayer = viewLayer) {
  const zoom = viewLayer + Math.log2(scale);
  const lower = Math.floor(zoom);
  const upper = lower + 1;
  const percent = Math.round((zoom - lower) * 100);
  return {
    lower,
    percent,
    tileLayer,
    upper,
    zoom: zoom.toFixed(2),
  };
}

export function createZoomChrome() {
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
  const status = createElement('div', 'slippy-map-zoom-status', {
    role: 'img',
  });
  const layer = createElement('strong');
  const track = createElement('span', 'slippy-map-zoom-track');
  const fill = createElement('span', 'slippy-map-zoom-fill');
  track.append(fill);
  status.append(track, layer);
  controls.append(zoomIn, status, zoomOut);

  const update = (viewLayer, scale, tileLayer = viewLayer) => {
    const value = getZoomStatus(viewLayer, scale, tileLayer);
    layer.textContent = value.tileLayer;
    fill.style.height = `${value.percent}%`;
    status.setAttribute(
      'aria-label',
      lookup(
        'map.zoomProgress',
        'Layer {layer}; zoom {zoom}; {percent}% from level {lower} to {upper}.',
        {
          layer: value.tileLayer,
          lower: value.lower,
          percent: value.percent,
          upper: value.upper,
          zoom: value.zoom,
        },
      ),
    );
  };

  return { controls, status, update, zoomIn, zoomOut };
}
