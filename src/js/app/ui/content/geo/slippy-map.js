import { lookup } from '../../../../i18n/index.js';
import {
  TILE_SIZE,
  clamp,
  getWorldSize,
  projectCoordinates,
  unprojectPoint,
} from './projection.js';
import { createElement } from './slippy-elements.js';
import { createFallbackTile } from './tile-fallback.js';
import { createWheelZoomHandler } from './interaction/wheel-zoom.js';
import { createDynamicAttribution } from './data/attribution.js';
import { positionMarker } from './data/marker-position.js';

const DEFAULT_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

export { projectCoordinates, unprojectPoint } from './projection.js';

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

  container.replaceChildren();
  container.classList.add('slippy-map');
  container.tabIndex = 0;
  container.setAttribute('role', 'region');
  const tileLayer = createElement('div', 'slippy-map-tiles', {
    'aria-hidden': 'true',
  });
  const marker = createElement('div', 'slippy-map-marker', {
    'aria-hidden': 'true',
  });
  const label = createElement('div', 'slippy-map-label');
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
      const maximumTile = 2 ** currentZoom - 1;
      const visible = new Set();
      const firstX = Math.floor(origin.x / TILE_SIZE);
      const lastX = Math.floor((origin.x + width - 1) / TILE_SIZE);
      const firstY = Math.max(0, Math.floor(origin.y / TILE_SIZE));
      const lastY = Math.min(
        maximumTile,
        Math.floor((origin.y + height - 1) / TILE_SIZE),
      );

      for (let tileY = firstY; tileY <= lastY; tileY += 1) {
        for (let tileX = firstX; tileX <= lastX; tileX += 1) {
          const key = `${currentZoom}:${tileX}:${tileY}`;
          visible.add(key);
          let element = tiles.get(key);
          if (!element) {
            element = createFallbackTile({
              template: tileUrl,
              tile: { zoom: currentZoom, x: tileX, y: tileY },
              minimumSourceZoom,
              maximumSourceZoom,
            });
            tiles.set(key, element);
            tileLayer.appendChild(element);
          }
          element.style.left = `${Math.round(tileX * TILE_SIZE - origin.x)}px`;
          element.style.top = `${Math.round(tileY * TILE_SIZE - origin.y)}px`;
        }
      }
      tiles.forEach((element, key) => {
        if (visible.has(key)) return;
        element.remove();
        tiles.delete(key);
      });

      positionMarker({
        marker,
        label,
        coordinates: markerCoordinates,
        centerPoint,
        zoom: currentZoom,
        worldSize,
        width,
        height,
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
  const setZoom = (value) => {
    const next = clamp(value, minimumZoom, maximumZoom);
    if (next === currentZoom) {
      if (value < minimumZoom) onMinimumZoomOut?.();
      return;
    }
    currentZoom = next;
    tiles.forEach((element) => element.remove());
    tiles.clear();
    scheduleRender();
  };
  const selectAt = (clientX, clientY) => {
    const bounds = container.getBoundingClientRect();
    const centerPoint = projectCoordinates(currentCenter, currentZoom);
    onSelect?.(
      unprojectPoint(
        {
          x: centerPoint.x + clientX - bounds.left - bounds.width / 2,
          y: centerPoint.y + clientY - bounds.top - bounds.height / 2,
        },
        currentZoom,
      ),
    );
  };

  zoomIn.addEventListener('click', () => setZoom(currentZoom + 1));
  zoomOut.addEventListener('click', () => setZoom(currentZoom - 1));
  container.addEventListener(
    'wheel',
    createWheelZoomHandler((step) => setZoom(currentZoom + step)),
    { passive: false },
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
      setCenterFromPoint({ x: centerPoint.x + x, y: centerPoint.y + y });
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
        x: drag.center.x - deltaX,
        y: drag.center.y - deltaY,
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
