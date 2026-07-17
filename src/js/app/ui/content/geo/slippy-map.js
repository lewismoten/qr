import { lookup } from '../../../../i18n/index.js';

const TILE_SIZE = 256;
const MIN_ZOOM = 0;
const MAX_ZOOM = 19;
const MAX_LATITUDE = 85.05112878;
const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
const normalizeLongitude = (value) => ((value + 180) % 360 + 360) % 360 - 180;
const getWorldSize = (zoom) => TILE_SIZE * (2 ** zoom);

export function projectCoordinates({ latitude, longitude }, zoom) {
  const worldSize = getWorldSize(zoom);
  const boundedLatitude = clamp(latitude, -MAX_LATITUDE, MAX_LATITUDE);
  const sine = Math.sin((boundedLatitude * Math.PI) / 180);
  return {
    x: ((normalizeLongitude(longitude) + 180) / 360) * worldSize,
    y: (0.5 - Math.log((1 + sine) / (1 - sine)) / (4 * Math.PI)) * worldSize,
  };
}

export function unprojectPoint({ x, y }, zoom) {
  const worldSize = getWorldSize(zoom);
  const longitude = normalizeLongitude((x / worldSize) * 360 - 180);
  const latitude = (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / worldSize))) * 180) / Math.PI;
  return { latitude: clamp(latitude, -MAX_LATITUDE, MAX_LATITUDE), longitude };
}

function createElement(tag, className, attributes = {}) {
  const element = document.createElement(tag);
  element.className = className;
  Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, value));
  return element;
}

export function createSlippyMap(container, { center, zoom = 13, onSelect }) {
  const tiles = new Map();
  const pointers = new Map();
  let currentCenter = { ...center };
  let currentZoom = clamp(zoom, MIN_ZOOM, MAX_ZOOM);
  let markerCoordinates = null;
  let frameRequest = 0;
  let drag = null;
  let pinchDistance = 0;

  container.replaceChildren();
  container.classList.add('slippy-map');
  container.tabIndex = 0;
  container.setAttribute('role', 'region');
  const tileLayer = createElement('div', 'slippy-map-tiles', { 'aria-hidden': 'true' });
  const marker = createElement('div', 'slippy-map-marker', { 'aria-hidden': 'true' });
  const label = createElement('div', 'slippy-map-label');
  const controls = createElement('div', 'slippy-map-controls', {
    'aria-label': lookup('map.zoomControls', 'Map zoom controls'),
  });
  const zoomIn = createElement('button', 'slippy-map-control', {
    type: 'button', 'aria-label': lookup('map.zoomIn', 'Zoom in'),
  });
  const zoomOut = createElement('button', 'slippy-map-control', {
    type: 'button', 'aria-label': lookup('map.zoomOut', 'Zoom out'),
  });
  zoomIn.textContent = '+';
  zoomOut.textContent = '-';
  controls.append(zoomIn, zoomOut);
  const attribution = createElement('div', 'slippy-map-attribution');
  const attributionLink = document.createElement('a');
  attributionLink.href = 'https://www.openstreetmap.org/copyright';
  attributionLink.textContent = lookup('map.attribution', '© OpenStreetMap contributors');
  attribution.appendChild(attributionLink);
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
      const origin = { x: centerPoint.x - width / 2, y: centerPoint.y - height / 2 };
      const maximumTile = (2 ** currentZoom) - 1;
      const visible = new Set();
      const firstX = Math.floor(origin.x / TILE_SIZE);
      const lastX = Math.floor((origin.x + width - 1) / TILE_SIZE);
      const firstY = Math.max(0, Math.floor(origin.y / TILE_SIZE));
      const lastY = Math.min(maximumTile, Math.floor((origin.y + height - 1) / TILE_SIZE));

      for (let tileY = firstY; tileY <= lastY; tileY += 1) {
        for (let tileX = firstX; tileX <= lastX; tileX += 1) {
          const key = `${currentZoom}:${tileX}:${tileY}`;
          visible.add(key);
          let image = tiles.get(key);
          if (!image) {
            const wrappedX = ((tileX % (maximumTile + 1)) + maximumTile + 1) % (maximumTile + 1);
            image = createElement('img', 'slippy-map-tile', { alt: '', draggable: 'false' });
            image.decoding = 'async';
            image.src = TILE_URL.replace('{z}', currentZoom).replace('{x}', wrappedX).replace('{y}', tileY);
            tiles.set(key, image);
            tileLayer.appendChild(image);
          }
          image.style.left = `${Math.round(tileX * TILE_SIZE - origin.x)}px`;
          image.style.top = `${Math.round(tileY * TILE_SIZE - origin.y)}px`;
        }
      }
      tiles.forEach((image, key) => {
        if (visible.has(key)) return;
        image.remove();
        tiles.delete(key);
      });

      if (!markerCoordinates) {
        marker.hidden = true;
        label.hidden = true;
        return;
      }
      const markerPoint = projectCoordinates(markerCoordinates, currentZoom);
      let deltaX = markerPoint.x - centerPoint.x;
      if (deltaX > worldSize / 2) deltaX -= worldSize;
      if (deltaX < -worldSize / 2) deltaX += worldSize;
      const left = width / 2 + deltaX;
      const top = height / 2 + markerPoint.y - centerPoint.y;
      marker.hidden = false;
      marker.style.left = `${left}px`;
      marker.style.top = `${top}px`;
      label.style.left = `${left}px`;
      label.style.top = `${top}px`;
    });
  };

  const setCenterFromPoint = (point) => {
    const worldSize = getWorldSize(currentZoom);
    currentCenter = unprojectPoint({ x: point.x, y: clamp(point.y, 0, worldSize) }, currentZoom);
    scheduleRender();
  };
  const setZoom = (value) => {
    const next = clamp(value, MIN_ZOOM, MAX_ZOOM);
    if (next === currentZoom) return;
    currentZoom = next;
    tiles.forEach((image) => image.remove());
    tiles.clear();
    scheduleRender();
  };
  const selectAt = (clientX, clientY) => {
    const bounds = container.getBoundingClientRect();
    const centerPoint = projectCoordinates(currentCenter, currentZoom);
    onSelect?.(unprojectPoint({
      x: centerPoint.x + clientX - bounds.left - bounds.width / 2,
      y: centerPoint.y + clientY - bounds.top - bounds.height / 2,
    }, currentZoom));
  };

  zoomIn.addEventListener('click', () => setZoom(currentZoom + 1));
  zoomOut.addEventListener('click', () => setZoom(currentZoom - 1));
  container.addEventListener('wheel', (event) => {
    event.preventDefault();
    setZoom(currentZoom + (event.deltaY < 0 ? 1 : -1));
  }, { passive: false });
  container.addEventListener('keydown', (event) => {
    if (event.target.closest('.slippy-map-controls, .slippy-map-attribution')) return;
    const movements = { ArrowLeft: [-64, 0], ArrowRight: [64, 0], ArrowUp: [0, -64], ArrowDown: [0, 64] };
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
    if (event.target.closest('.slippy-map-controls, .slippy-map-attribution')) return;
    container.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 1) {
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY,
        center: projectCoordinates(currentCenter, currentZoom), moved: false };
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
      setCenterFromPoint({ x: drag.center.x - deltaX, y: drag.center.y - deltaY });
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
    const select = !cancelled && pointers.size === 1 && drag?.id === event.pointerId && !drag.moved;
    pointers.delete(event.pointerId);
    if (select) selectAt(event.clientX, event.clientY);
    const remaining = [...pointers.entries()][0];
    drag = remaining ? { id: remaining[0], x: remaining[1].x, y: remaining[1].y,
      center: projectCoordinates(currentCenter, currentZoom), moved: true } : null;
    if (!remaining) container.classList.remove('is-dragging');
  };
  container.addEventListener('pointerup', (event) => finishPointer(event));
  container.addEventListener('pointercancel', (event) => finishPointer(event, true));

  const resizeObserver = new ResizeObserver(scheduleRender);
  resizeObserver.observe(container);
  scheduleRender();

  return {
    getZoom: () => currentZoom,
    setView(nextCenter, nextZoom = currentZoom) {
      currentCenter = { latitude: nextCenter.latitude, longitude: nextCenter.longitude };
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
