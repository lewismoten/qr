import { lookup } from '../../../../i18n/index.js';
import {
  clamp,
  getWorldSize,
  projectCoordinates,
  unprojectPoint,
} from './projection.js';
import { createElement } from './slippy-elements.js';
import { attachSmoothWheelZoom } from './interaction/smooth-wheel-zoom.js';
import { createMapPitch } from './interaction/map-pitch.js';
import { attachMapPointerDrag } from './interaction/pointer-drag.js';
import {
  centerZoomAtEvent,
  coordinatesAtPointer,
} from './interaction/pointer-zoom.js';
import { createZoomChrome } from './interaction/zoom-status.js';
import {
  syncTileLayerView,
  transitionTileLayer,
} from './interaction/tile-transition.js';
import { createDynamicAttribution } from './data/attribution.js';
import { positionMarker } from './data/marker-position.js';
import { renderTileLayer } from './data/tile-layer.js';

const DEFAULT_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const KEYBOARD_PAN_PIXELS = 64;

export function createSlippyMap(
  container,
  {
    center,
    zoom = 13,
    onSelect,
    tileUrl = DEFAULT_TILE_URL,
    minimumZoom = 0,
    maximumZoom = 19,
    minSourceZoom = minimumZoom,
    maxSourceZoom = maximumZoom,
    hasSourceTile,
    getTileBundle,
    attributionText = lookup('map.attribution', '© OpenStreetMap contributors'),
    attributionUrl = 'https://www.openstreetmap.org/copyright',
    secondaryCredit,
    showSecondaryAttribution,
    extraCredits,
    onMinimumZoomOut,
    tileFactory,
  },
) {
  const tiles = new Map();
  let currentCenter = { ...center };
  let currentZoom = clamp(zoom, minimumZoom, maximumZoom);
  let markerCoordinates = null;
  let frameRequest = 0;
  let tileScale = 1;
  container.replaceChildren();
  container.classList.add('slippy-map');
  container.tabIndex = 0;
  container.setAttribute('role', 'region');
  let tileLayer = createElement('div', 'slippy-map-tiles', {
    'aria-hidden': 'true',
  });
  const marker = createElement('div', 'slippy-map-marker', {
    'aria-hidden': 'true',
  });
  const label = createElement('div', 'slippy-map-label');
  const zoomChrome = createZoomChrome((enabled) => {
    container.classList.toggle('show-tile-overlay', enabled);
  });
  const { controls, zoomIn, zoomOut } = zoomChrome;
  const dynamicAttribution = createDynamicAttribution({
    text: attributionText,
    url: attributionUrl,
    secondary: secondaryCredit,
    showSecondary: showSecondaryAttribution,
    additional: extraCredits,
  });
  const attribution = dynamicAttribution.element;
  const mapPitch = createMapPitch({
    container,
    controls,
    initialLayer: tileLayer,
    maximumZoom,
    minimumZoom,
    onChange: () => scheduleRender(),
  });
  container.append(mapPitch.camera, marker, label, controls, attribution);
  const scheduleRender = () => {
    if (frameRequest) return;
    frameRequest = requestAnimationFrame(() => {
      frameRequest = 0;
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (!width || !height) return;
      const worldSize = getWorldSize(currentZoom);
      const centerPoint = projectCoordinates(currentCenter, currentZoom);
      syncTileLayerView(tileLayer, currentCenter, currentZoom, centerPoint);
      dynamicAttribution.update({
        center: currentCenter,
        zoom: currentZoom,
        width,
        height,
      });
      const origin = {
        x: centerPoint.x - width / 2,
        y: centerPoint.y - height / 2,
      };
      const renderingLayer = tileLayer;
      mapPitch.update(currentZoom, tileScale);
      renderTileLayer({
        tiles,
        layer: tileLayer,
        template: tileUrl,
        zoom: currentZoom,
        center: centerPoint,
        width,
        height,
        scale: tileScale,
        minSourceZoom,
        maxSourceZoom,
        hasSourceTile,
        getTileBundle,
        origin,
        onFallbackChange: scheduleRender,
        viewportBounds: mapPitch.getViewportBounds(),
        tileFactory,
      });
      const sourceZoom = renderingLayer.slippySourceZoom;
      zoomChrome.update(currentZoom, tileScale, sourceZoom);
      positionMarker({
        marker,
        label,
        coordinates: markerCoordinates,
        centerPoint,
        zoom: currentZoom,
        worldSize,
        width,
        height,
        scale: tileScale,
        projectPoint: mapPitch.projectPoint,
      });
    });
  };
  const setCenterFromPoint = (point) => {
    const worldSize = getWorldSize(currentZoom);
    currentCenter = unprojectPoint(
      { x: point.x, y: clamp(point.y, 0, worldSize) },
      currentZoom,
    );
    scheduleRender();
  };
  const centerAtPointer = (nextZoom, nextScale, event) => {
    const mapEvent = event
      ? mapPitch.toMapClient(event.clientX, event.clientY)
      : event;
    currentCenter = centerZoomAtEvent(container, mapEvent, {
      center: currentCenter,
      scale: tileScale,
      zoom: currentZoom,
      nextScale,
      nextZoom,
    });
  };
  const setZoom = (value, nextScale = 1, event) => {
    const next = clamp(value, minimumZoom, maximumZoom);
    if (next === currentZoom) {
      if (value < minimumZoom) onMinimumZoomOut?.();
      return;
    }
    const scale = 2 ** (next - currentZoom);
    centerAtPointer(next, nextScale, event);
    currentZoom = next;
    tileScale = nextScale;
    tileLayer = transitionTileLayer(
      mapPitch.camera,
      tileLayer,
      null,
      scale * nextScale,
      nextScale,
    );
    tiles.clear();
    scheduleRender();
  };
  const selectAt = (clientX, clientY) => {
    const point = mapPitch.toMapClient(clientX, clientY);
    onSelect?.(
      coordinatesAtPointer(container, point.clientX, point.clientY, {
        center: currentCenter,
        scale: tileScale,
        zoom: currentZoom,
      }),
    );
  };
  zoomIn.addEventListener('click', () => setZoom(currentZoom + 1));
  zoomOut.addEventListener('click', () => setZoom(currentZoom - 1));
  attachSmoothWheelZoom(
    container,
    () => tileLayer,
    (step, nextScale, event) => setZoom(currentZoom + step, nextScale, event),
    (scale, event) => {
      centerAtPointer(currentZoom, scale, event);
      tileScale = scale;
      scheduleRender();
    },
    {
      canZoom: (step) =>
        step > 0 ? currentZoom < maximumZoom : currentZoom > minimumZoom,
    },
  );
  container.addEventListener('keydown', (event) => {
    if (event.target.closest('.slippy-map-controls, .slippy-map-attribution'))
      return;
    const movements = {
      ArrowLeft: [-KEYBOARD_PAN_PIXELS, 0],
      ArrowRight: [KEYBOARD_PAN_PIXELS, 0],
      ArrowUp: [0, -KEYBOARD_PAN_PIXELS],
      ArrowDown: [0, KEYBOARD_PAN_PIXELS],
    };
    if (event.key === '+' || event.key === '=') setZoom(currentZoom + 1);
    else if (event.key === '-' || event.key === '_') setZoom(currentZoom - 1);
    else if (movements[event.key]) {
      const centerPoint = projectCoordinates(currentCenter, currentZoom);
      const [x, y] = movements[event.key];
      setCenterFromPoint({
        x: centerPoint.x + x / tileScale,
        y: centerPoint.y + y / tileScale,
      });
    } else return;
    event.preventDefault();
  });
  attachMapPointerDrag(container, {
    getCenterPoint: () => projectCoordinates(currentCenter, currentZoom),
    onPan(centerPoint, deltaX, deltaY) {
      setCenterFromPoint({
        x: centerPoint.x - deltaX / tileScale,
        y: centerPoint.y - deltaY / tileScale,
      });
    },
    onSelect: selectAt,
    onZoom: (step) => setZoom(currentZoom + step),
    toMapClient: mapPitch.toMapClient,
  });
  const resizeObserver = new ResizeObserver(scheduleRender);
  resizeObserver.observe(container);
  scheduleRender();
  return {
    getView: () => ({
      center: { ...currentCenter },
      zoom: currentZoom,
    }),
    getZoom: () => currentZoom,
    setView(nextCenter, nextZoom = currentZoom) {
      currentCenter = {
        latitude: nextCenter.latitude,
        longitude: nextCenter.longitude,
      };
      setZoom(nextZoom);
      scheduleRender();
    },
    setMarker(coordinates, text = '') {
      markerCoordinates = coordinates ? { ...coordinates } : null;
      marker.title = coordinates ? text : '';
      label.textContent = text;
      label.hidden = !coordinates || !text;
      scheduleRender();
    },
  };
}
