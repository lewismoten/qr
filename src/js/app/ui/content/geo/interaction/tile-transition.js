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
  current.style.setProperty('--slippy-target-scale', scale);
  current.classList.add('is-zoom-leaving');
  container.insertBefore(next, before);
  setTimeout(() => revealTileLayer(next, true), LOAD_FALLBACK_DELAY);
  return next;
}
