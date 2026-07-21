import { lookup } from '../../../../../i18n/index.js';
import { HALF_TURN_DEGREES } from '../projection.js';
import { createElement } from '../slippy-elements.js';

const MAXIMUM_PITCH = 60;
const PERSPECTIVE = 720;
const PITCH_START_ZOOM = 5;
const MAXIMUM_LOOKBACK_HEIGHTS = 7;
const SMOOTHSTEP_LEADING_FACTOR = 3;
const SMOOTHSTEP_TRAILING_FACTOR = 2;
const HORIZON_SCREEN_INSET = 32;

const smoothstep = (value) =>
  value *
  value *
  (SMOOTHSTEP_LEADING_FACTOR - SMOOTHSTEP_TRAILING_FACTOR * value);

export function getMapPitch(zoom, minimumZoom, maximumZoom) {
  if (maximumZoom <= minimumZoom) return 0;
  const start = Math.max(
    minimumZoom,
    Math.min(maximumZoom - 1, PITCH_START_ZOOM),
  );
  if (zoom <= start) return 0;
  const progress = Math.min(1, (zoom - start) / (maximumZoom - start));
  return MAXIMUM_PITCH * smoothstep(progress);
}

export function projectPitchedPoint(
  point,
  { height, pitch, width, perspective = PERSPECTIVE },
) {
  if (!pitch) return { ...point };
  const radians = (pitch * Math.PI) / HALF_TURN_DEGREES;
  const relativeY = point.y - height;
  const depth = relativeY * Math.sin(radians);
  const factor = perspective / (perspective - depth);
  return {
    x: width / 2 + (point.x - width / 2) * factor,
    y: height + relativeY * Math.cos(radians) * factor,
  };
}

export function unprojectPitchedPoint(
  point,
  { height, pitch, width, perspective = PERSPECTIVE },
) {
  if (!pitch) return { ...point };
  const radians = (pitch * Math.PI) / HALF_TURN_DEGREES;
  const relativeY = point.y - height;
  const denominator =
    Math.cos(radians) * perspective + relativeY * Math.sin(radians);
  const planeY = (relativeY * perspective) / denominator;
  const depth = planeY * Math.sin(radians);
  const factor = perspective / (perspective - depth);
  return {
    x: width / 2 + (point.x - width / 2) / factor,
    y: height + planeY,
  };
}

export function getPitchedViewportBounds(
  { height, pitch, width },
  perspective = PERSPECTIVE,
) {
  if (!pitch) return { bottom: height, left: 0, right: width, top: 0 };
  const radians = (pitch * Math.PI) / HALF_TURN_DEGREES;
  const horizon = height - perspective / Math.tan(radians);
  const screenTop = Math.max(0, horizon + HORIZON_SCREEN_INSET);
  const rawTop = unprojectPitchedPoint(
    { x: width / 2, y: screenTop },
    { height, perspective, pitch, width },
  ).y;
  const top = Math.max(-height * MAXIMUM_LOOKBACK_HEIGHTS, rawTop);
  const depth = (top - height) * Math.sin(radians);
  const factor = perspective / (perspective - depth);
  const halfPlaneWidth = width / (2 * factor);
  return {
    bottom: height,
    left: width / 2 - halfPlaneWidth,
    right: width / 2 + halfPlaneWidth,
    top,
  };
}

function setButtonState(button, enabled) {
  const key = enabled ? 'map.pitchDisable' : 'map.pitchEnable';
  const fallback = enabled ? 'Disable perspective' : 'Enable perspective';
  const label = lookup(key, fallback);
  button.setAttribute('aria-label', label);
  button.setAttribute('aria-pressed', String(enabled));
  button.title = label;
}

export function createMapPitch({
  container,
  controls,
  initialLayer,
  maximumZoom,
  minimumZoom,
  onChange = () => {},
}) {
  const camera = createElement('div', 'slippy-map-camera', {
    'aria-hidden': 'true',
  });
  const button = createElement(
    'button',
    'slippy-map-control slippy-map-pitch-control',
    { type: 'button' },
  );
  const icon = createElement('span', 'slippy-map-pitch-icon', {
    'aria-hidden': 'true',
  });
  let enabled = true;
  let pitch = 0;
  camera.append(initialLayer);
  button.append(icon);
  controls.append(button);
  setButtonState(button, enabled);

  const update = (zoom, scale = 1) => {
    const visualZoom = zoom + Math.log2(scale);
    pitch = enabled ? getMapPitch(visualZoom, minimumZoom, maximumZoom) : 0;
    camera.style.setProperty('--slippy-map-pitch', `${pitch}deg`);
    container.classList.toggle('has-map-pitch', pitch > 0);
  };
  const getProjection = () => ({
    height: container.clientHeight,
    pitch,
    width: container.clientWidth,
  });
  const projectPoint = (point) => projectPitchedPoint(point, getProjection());
  const getViewportBounds = () => getPitchedViewportBounds(getProjection());
  const toMapClient = (clientX, clientY) => {
    const bounds = container.getBoundingClientRect();
    const point = unprojectPitchedPoint(
      { x: clientX - bounds.left, y: clientY - bounds.top },
      { height: bounds.height, pitch, width: bounds.width },
    );
    return { clientX: point.x + bounds.left, clientY: point.y + bounds.top };
  };

  button.addEventListener('click', () => {
    const previousPitch = pitch;
    enabled = !enabled;
    camera.classList.add('is-pitch-transitioning');
    container.classList.add('is-map-pitch-transitioning');
    setButtonState(button, enabled);
    button.classList.toggle('is-active', enabled);
    update(camera.slippyZoom ?? minimumZoom, camera.slippyScale ?? 1);
    onChange();
    if (pitch === previousPitch) {
      camera.classList.remove('is-pitch-transitioning');
      container.classList.remove('is-map-pitch-transitioning');
    }
  });
  button.classList.add('is-active');
  camera.addEventListener('transitionend', () => {
    camera.classList.remove('is-pitch-transitioning');
    container.classList.remove('is-map-pitch-transitioning');
  });

  return {
    camera,
    getViewportBounds,
    projectPoint,
    toMapClient,
    update(zoom, scale) {
      camera.slippyZoom = zoom;
      camera.slippyScale = scale;
      update(zoom, scale);
    },
  };
}
