import { lookup } from '../../../../i18n/index.js';
import {
  clamp,
  getWorldSize,
  projectCoordinates,
  unprojectPoint,
} from './projection.js';
import { createElement } from './slippy-elements.js';
import { attachSmoothWheelZoom } from './interaction/smooth-wheel-zoom.js';
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
export function createSlippyMap(
  container,
  {
    center,
    zoom = 13,
    onSelect,
    tileUrl = DEFAULT_TILE_URL,
    minimumZoom = 0,
    maximumZoom = 19,
    minimumSourceZoom = minimumZoom,
    maximumSourceZoom = maximumZoom,
    hasSourceTile,
    getTileBundle,
    attributionText = lookup('map.attribution', '© OpenStreetMap contributors'),
    attributionUrl = 'https://www.openstreetmap.org/copyright',
    secondaryAttribution,
    showSecondaryAttribution,
    onMinimumZoomOut,
  },
) {
  const tiles = new Map();
  const pointers = new Map();
  let currentCenter = { ...center };
  let currentZoom = clamp(zoom, minimumZoom, maximumZoom);
  let markerCoordinates = null;
  let frameRequest = 0;
  let drag = null;
  let pinchDistance = 0;
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
  const zoomChrome = createZoomChrome();
  const { controls, zoomIn, zoomOut } = zoomChrome;
  const dynamicAttribution = createDynamicAttribution({
    text: attributionText,
    url: attributionUrl,
    secondary: secondaryAttribution,
    showSecondary: showSecondaryAttribution,
  });
  const attribution = dynamicAttribution.element;
  container.append(tileLayer, marker, label, controls, attribution);
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
      renderTileLayer({
        tiles,
        layer: tileLayer,
        template: tileUrl,
        zoom: currentZoom,
        center: centerPoint,
        width,
        height,
        scale: tileScale,
        minimumSourceZoom,
        maximumSourceZoom,
        hasSourceTile,
        getTileBundle,
        origin,
        onFallbackChange: scheduleRender,
      });
      zoomChrome.update(
        currentZoom,
        tileScale,
        renderingLayer.slippyUsesFallback,
      );
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
    currentCenter = centerZoomAtEvent(container, event, {
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
      container,
      tileLayer,
      marker,
      scale * nextScale,
      nextScale,
    );
    tiles.clear();
    scheduleRender();
  };
  const selectAt = (clientX, clientY) =>
    onSelect?.(
      coordinatesAtPointer(container, clientX, clientY, {
        center: currentCenter,
        scale: tileScale,
        zoom: currentZoom,
      }),
    );
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
  );
  container.addEventListener('keydown', (event) => {
    if (event.target.closest('.slippy-map-controls, .slippy-map-attribution'))
      return;
    const movements = {
      ArrowLeft: [-64, 0],
      ArrowRight: [64, 0],
      ArrowUp: [0, -64],
      ArrowDown: [0, 64],
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
  container.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (event.target.closest('.slippy-map-controls, .slippy-map-attribution'))
      return;
    container.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 1) {
      drag = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        center: projectCoordinates(currentCenter, currentZoom),
        moved: false,
      };
      container.classList.add('is-dragging');
    } else if (pointers.size === 2) {
      const [first, second] = [...pointers.values()];
      pinchDistance = Math.hypot(second.x - first.x, second.y - first.y);
    }
  });
  container.addEventListener('pointermove', (event) => {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 1 && drag?.id === event.pointerId) {
      const deltaX = event.clientX - drag.x;
      const deltaY = event.clientY - drag.y;
      if (Math.hypot(deltaX, deltaY) > 4) drag.moved = true;
      setCenterFromPoint({
        x: drag.center.x - deltaX / tileScale,
        y: drag.center.y - deltaY / tileScale,
      });
    } else if (pointers.size === 2) {
      const [first, second] = [...pointers.values()];
      const distance = Math.hypot(second.x - first.x, second.y - first.y);
      if (distance > pinchDistance * 1.35) {
        setZoom(currentZoom + 1);
        pinchDistance = distance;
      } else if (distance < pinchDistance * 0.74) {
        setZoom(currentZoom - 1);
        pinchDistance = distance;
      }
    }
  });
  const finishPointer = (event, cancelled = false) => {
    if (!pointers.has(event.pointerId)) return;
    const select =
      !cancelled &&
      pointers.size === 1 &&
      drag?.id === event.pointerId &&
      !drag.moved;
    pointers.delete(event.pointerId);
    if (select) selectAt(event.clientX, event.clientY);
    const remaining = [...pointers.entries()][0];
    drag = remaining
      ? {
          id: remaining[0],
          x: remaining[1].x,
          y: remaining[1].y,
          center: projectCoordinates(currentCenter, currentZoom),
          moved: true,
        }
      : null;
    if (!remaining) container.classList.remove('is-dragging');
  };
  container.addEventListener('pointerup', (event) => finishPointer(event));
  container.addEventListener('pointercancel', (event) =>
    finishPointer(event, true),
  );
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
