import { getWorldSize, projectCoordinates } from '../projection.js';
import { createAttribution } from '../slippy-elements.js';

const CENSUS_ZOOM = 6;
const USGS_ZOOM = 9;
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

export function hasVisibleCensusData(view) {
  if (view.zoom < CENSUS_ZOOM || !view.width || !view.height) return false;
  return CENSUS_REGIONS.some((bounds) => intersectsViewport(bounds, view));
}

export function hasVisibleUsgsData(view) {
  if (view.zoom < USGS_ZOOM || !view.width || !view.height) return false;
  return CENSUS_REGIONS.some((bounds) => intersectsViewport(bounds, view));
}

export function createDynamicAttribution({
  text,
  url,
  secondary,
  showSecondary,
  additional = [],
}) {
  const element = createAttribution(text, url);
  const entries = [
    ...(secondary ? [{ ...secondary, visible: showSecondary }] : []),
    ...additional,
  ];
  const additionalElements = entries.map((entry) => {
    const entryElement = document.createElement('span');
    entryElement.hidden = Boolean(entry.visible);
    const link = document.createElement('a');
    link.href = entry.url;
    link.textContent = entry.text;
    entryElement.append(' / ', link);
    element.appendChild(entryElement);
    return { element: entryElement, visible: entry.visible };
  });
  return {
    element,
    update(view) {
      additionalElements.forEach((entry) => {
        entry.element.hidden = entry.visible ? !entry.visible(view) : false;
      });
    },
  };
}
