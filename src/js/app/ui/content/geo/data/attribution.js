import {
  getWorldSize,
  projectCoordinates,
  TILE_SIZE,
  unprojectPoint,
} from '../projection.js';
import { createAttribution } from '../slippy-elements.js';

const CENSUS_ZOOM = 6;
const USGS_ZOOM = 9;
const TILE_CENTER_OFFSET = 0.5;
const CENSUS_REGIONS = [
  { west: -125, south: 24, east: -66, north: 50 },
  { west: -180, south: 51, east: -129, north: 72 },
  { west: 170, south: 51, east: 180, north: 72 },
  { west: -161, south: 18, east: -154, north: 23 },
  { west: -68, south: 17, east: -64, north: 19 },
  { west: 144, south: 13, east: 146, north: 21 },
  { west: -171, south: -15, east: -168, north: -13 },
];

function intersectsViewport(bounds, view) {
  const worldSize = getWorldSize(view.zoom);
  const center = projectCoordinates(view.center, view.zoom);
  const northWest = projectCoordinates(
    { latitude: bounds.north, longitude: bounds.west },
    view.zoom,
  );
  const southEast = projectCoordinates(
    { latitude: bounds.south, longitude: bounds.east },
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

export function hasUsgsTile({ zoom, x, y } = {}) {
  if (zoom < USGS_ZOOM || !Number.isFinite(x) || !Number.isFinite(y)) {
    return false;
  }
  const center = unprojectPoint(
    {
      x: (x + TILE_CENTER_OFFSET) * TILE_SIZE,
      y: (y + TILE_CENTER_OFFSET) * TILE_SIZE,
    },
    zoom,
  );
  return CENSUS_REGIONS.some(
    (bounds) =>
      center.longitude >= bounds.west &&
      center.longitude <= bounds.east &&
      center.latitude >= bounds.south &&
      center.latitude <= bounds.north,
  );
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
