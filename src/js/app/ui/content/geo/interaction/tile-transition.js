import { getWorldSize, projectCoordinates } from '../projection.js';

const TRANSITION_DURATION = 360;
const LOAD_FALLBACK_DELAY = 3000;

export function revealTileLayer(layer, force = false) {
  if (
    !layer.classList.contains('is-zoom-entering') ||
    layer.classList.contains('is-zoom-ready')
  )
    return;
  if (!force && layer.slippyPendingTiles?.size) return;
  const current = layer.slippyPreviousLayer;
  requestAnimationFrame(() => {
    current.classList.add('is-zoom-active');
    layer.classList.add('is-zoom-ready');
  });
  setTimeout(() => current.remove(), TRANSITION_DURATION);
}

export function setTileLayerCoverage(layer, visible, tiles) {
  if (!layer.classList.contains('is-zoom-entering')) return;
  layer.slippyPendingTiles = new Set(
    [...visible].filter((key) => !tiles.get(key)?.slippyLoaded),
  );
  revealTileLayer(layer);
}

export function syncTileLayerView(layer, center, zoom, centerPoint) {
  layer.slippyView = { centerPoint, zoom };
  const previous = layer.slippyPreviousLayer;
  const view = previous?.slippyView;
  if (!view) return;
  const point = projectCoordinates(center, view.zoom);
  const worldSize = getWorldSize(view.zoom);
  let deltaX = view.centerPoint.x - point.x;
  if (deltaX > worldSize / 2) deltaX -= worldSize;
  if (deltaX < -worldSize / 2) deltaX += worldSize;
  const scale = previous.slippyTargetScale;
  previous.style.setProperty('--slippy-offset-x', `${deltaX * scale}px`);
  previous.style.setProperty(
    '--slippy-offset-y',
    `${(view.centerPoint.y - point.y) * scale}px`,
  );
}

export function transitionTileLayer(
  container,
  current,
  before,
  scale,
  nextScale = 1,
) {
  const next = document.createElement('div');
  next.className = 'slippy-map-tiles';
  next.classList.add('is-zoom-entering');
  next.setAttribute('aria-hidden', 'true');
  next.slippyPreviousLayer = current;
  next.style.setProperty('--slippy-preview-scale', nextScale);
  current.slippyTargetScale = scale;
  current.style.setProperty('--slippy-preview-scale', scale);
  current.style.setProperty('--slippy-target-scale', scale);
  current.classList.add('is-zoom-leaving');
  if (before) container.insertBefore(next, before);
  else container.append(next);
  setTimeout(() => revealTileLayer(next, true), LOAD_FALLBACK_DELAY);
  return next;
}
