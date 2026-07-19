const TRANSITION_DURATION = 360;
const LOAD_FALLBACK_DELAY = 480;

export function revealTileLayer(layer) {
  if (
    !layer.classList.contains('is-zoom-entering') ||
    layer.classList.contains('is-zoom-ready')
  )
    return;
  const current = layer.slippyPreviousLayer;
  requestAnimationFrame(() => {
    current.classList.add('is-zoom-active');
    layer.classList.add('is-zoom-ready');
  });
  setTimeout(() => current.remove(), TRANSITION_DURATION);
}

export function transitionTileLayer(container, current, before, scale) {
  const next = document.createElement('div');
  next.className = 'slippy-map-tiles';
  next.classList.add('is-zoom-entering');
  next.setAttribute('aria-hidden', 'true');
  next.slippyPreviousLayer = current;
  current.style.setProperty('--slippy-target-scale', scale);
  current.classList.add('is-zoom-leaving');
  container.insertBefore(next, before);
  setTimeout(() => revealTileLayer(next), LOAD_FALLBACK_DELAY);
  return next;
}
