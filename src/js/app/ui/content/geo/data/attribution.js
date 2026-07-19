import { getWorldSize, projectCoordinates } from '../projection.js';
import { createAttribution } from '../slippy-elements.js';

const CENSUS_ZOOM = 7;
const CENSUS_REGIONS = [
  [-125, 24, -66, 50],
  [-180, 51, -129, 72],
  [170, 51, 180, 72],
  [-161, 18, -154, 23],
  [-68, 17, -64, 19],
  [144, 13, 146, 21],
  [-171, -15, -168, -13],
];

function intersectsViewport(bounds, view) {
  const worldSize = getWorldSize(view.zoom);
  const center = projectCoordinates(view.center, view.zoom);
  const northWest = projectCoordinates(
    { latitude: bounds[3], longitude: bounds[0] },
    view.zoom,
  );
  const southEast = projectCoordinates(
    { latitude: bounds[1], longitude: bounds[2] },
    view.zoom,
  );
  if (southEast.x < northWest.x) southEast.x += worldSize;
  const viewport = {
    left: center.x - view.width / 2,
    right: center.x + view.width / 2,
    top: center.y - view.height / 2,
    bottom: center.y + view.height / 2,
  };
  const overlapsY =
    southEast.y >= viewport.top && northWest.y <= viewport.bottom;
  if (!overlapsY) return false;
  return [-worldSize, 0, worldSize].some((offset) => {
    const left = northWest.x + offset;
    const right = southEast.x + offset;
    return right >= viewport.left && left <= viewport.right;
  });
}

export function hasVisibleCensusCounties(view) {
  if (view.zoom < CENSUS_ZOOM || !view.width || !view.height) return false;
  return CENSUS_REGIONS.some((bounds) => intersectsViewport(bounds, view));
}

export function createDynamicAttribution({
  text,
  url,
  secondary,
  showSecondary,
}) {
  const element = createAttribution(text, url);
  let secondaryElement = null;
  if (secondary) {
    secondaryElement = document.createElement('span');
    secondaryElement.hidden = true;
    const link = document.createElement('a');
    link.href = secondary.url;
    link.textContent = secondary.text;
    secondaryElement.append(' / ', link);
    element.appendChild(secondaryElement);
  }
  return {
    element,
    update(view) {
      if (secondaryElement) {
        secondaryElement.hidden = !showSecondary?.(view);
      }
    },
  };
}
