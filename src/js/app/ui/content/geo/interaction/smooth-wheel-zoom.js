import { normalizeWheelDelta } from './wheel-zoom.js';

const clamp = (value, minimum, maximum) =>
  Math.min(maximum, Math.max(minimum, value));

export function createSmoothWheelZoomHandler(
  { onPreview, onCommit },
  {
    sensitivity = 240,
    settleDelay = 90,
    commitThreshold = 0.5,
    schedule = setTimeout,
    cancel = clearTimeout,
  } = {},
) {
  let amount = 0;
  let timer = null;
  const commit = () => {
    timer = null;
    if (!amount) return;
    onCommit(amount > 0 ? 1 : -1);
    amount = 0;
    onPreview(1);
  };
  return (event) => {
    event.preventDefault();
    amount = clamp(
      amount - normalizeWheelDelta(event, sensitivity) / sensitivity,
      -0.85,
      0.85,
    );
    onPreview(2 ** amount);
    if (timer !== null) cancel(timer);
    if (Math.abs(amount) >= commitThreshold) {
      onCommit(amount > 0 ? 1 : -1);
      amount = 0;
      timer = null;
      onPreview(1);
      return;
    }
    timer = schedule(commit, settleDelay);
  };
}

export function attachSmoothWheelZoom(container, getLayer, onCommit) {
  const handler = createSmoothWheelZoomHandler({
    onPreview(scale) {
      getLayer().style.setProperty('--slippy-preview-scale', scale);
    },
    onCommit,
  });
  container.addEventListener('wheel', handler, { passive: false });
}
