import { normalizeWheelDelta } from './wheel-zoom.js';

const clamp = (value, minimum, maximum) =>
  Math.min(maximum, Math.max(minimum, value));

export function createSmoothWheelZoomHandler(
  { onPreview, onCommit },
  { sensitivity = 240, commitThreshold = 0.5 } = {},
) {
  let amount = 0;
  return (event) => {
    event.preventDefault();
    amount = clamp(
      amount - normalizeWheelDelta(event, sensitivity) / sensitivity,
      -0.85,
      0.85,
    );
    if (Math.abs(amount) >= commitThreshold) {
      const step = amount > 0 ? 1 : -1;
      amount -= step;
      onCommit(step, 2 ** amount, event);
    }
    onPreview(2 ** amount, event);
  };
}

export function attachSmoothWheelZoom(
  container,
  getLayer,
  onCommit,
  onPreview,
) {
  const handler = createSmoothWheelZoomHandler({
    onPreview(scale, event) {
      getLayer().style.setProperty('--slippy-preview-scale', scale);
      onPreview?.(scale, event);
    },
    onCommit,
  });
  container.addEventListener('wheel', handler, { passive: false });
}
