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
  controls.append(zoomIn, zoomOut);

  const status = createElement('div', 'slippy-map-zoom-status');
  const summary = createElement('div', 'slippy-map-zoom-summary');
  const layer = createElement('strong');
  const zoom = createElement('span');
  const range = createElement('div', 'slippy-map-zoom-range');
  const lower = createElement('span');
  const track = createElement('span', 'slippy-map-zoom-track');
  const fill = createElement('span', 'slippy-map-zoom-fill');
  const upper = createElement('span');
  track.append(fill);
  summary.append(layer, zoom);
  range.append(lower, track, upper);
  status.append(summary, range);

  const update = (viewLayer, scale, tileLayer = viewLayer) => {
    const value = getZoomStatus(viewLayer, scale, tileLayer);
    layer.textContent = lookup('map.tileLayer', 'Layer {layer}', {
      layer: value.tileLayer,
    });
    zoom.textContent = lookup('map.zoomPosition', 'Zoom {zoom}', {
      zoom: value.zoom,
    });
    lower.textContent = value.lower;
    upper.textContent = value.upper;
    fill.style.width = `${value.percent}%`;
    status.setAttribute(
      'aria-label',
      lookup(
        'map.zoomProgress',
        'Zoom {zoom}; {percent}% from level {lower} to {upper}.',
        {
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
