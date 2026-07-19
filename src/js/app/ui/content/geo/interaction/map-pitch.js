import { lookup } from '../../../../../i18n/index.js';
import { createElement } from '../slippy-elements.js';

const MAXIMUM_PITCH = 68;
const PERSPECTIVE = 720;
const PITCH_START_ZOOM = 5;

const smoothstep = (value) => value * value * (3 - 2 * value);

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
  const radians = (pitch * Math.PI) / 180;
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
  const radians = (pitch * Math.PI) / 180;
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
    setButtonState(button, enabled);
    button.classList.toggle('is-active', enabled);
    update(camera.slippyZoom ?? minimumZoom, camera.slippyScale ?? 1);
    if (pitch === previousPitch)
      camera.classList.remove('is-pitch-transitioning');
  });
  button.classList.add('is-active');
  camera.addEventListener('transitionend', () => {
    camera.classList.remove('is-pitch-transitioning');
  });

  return {
    camera,
    projectPoint,
    toMapClient,
    update(zoom, scale) {
      camera.slippyZoom = zoom;
      camera.slippyScale = scale;
      update(zoom, scale);
    },
  };
}
