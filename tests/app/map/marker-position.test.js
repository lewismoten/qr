import assert from 'node:assert/strict';

import { positionMarker } from '../../../src/js/app/ui/content/geo/data/marker-position.js';
import {
  getWorldSize,
  projectCoordinates,
} from '../../../src/js/app/ui/content/geo/projection.js';

const makeElement = () => ({ hidden: false, style: {} });
const coordinates = { latitude: 8, longitude: 10 };
const center = { latitude: 0, longitude: 0 };

function markerPosition(zoom, scale) {
  const marker = makeElement();
  const label = makeElement();
  positionMarker({
    marker,
    label,
    coordinates,
    centerPoint: projectCoordinates(center, zoom),
    zoom,
    worldSize: getWorldSize(zoom),
    width: 500,
    height: 240,
    scale,
  });
  assert.equal(marker.style.left, label.style.left);
  assert.equal(marker.style.top, label.style.top);
  return {
    left: Number.parseFloat(marker.style.left),
    top: Number.parseFloat(marker.style.top),
  };
}

const lowerLevel = markerPosition(4, 1.5);
const upperLevel = markerPosition(5, 0.75);
assert.ok(Math.abs(lowerLevel.left - upperLevel.left) < 1e-10);
assert.ok(Math.abs(lowerLevel.top - upperLevel.top) < 1e-10);

const marker = makeElement();
const label = makeElement();
positionMarker({
  marker,
  label,
  coordinates: null,
  centerPoint: { x: 0, y: 0 },
  zoom: 2,
  worldSize: getWorldSize(2),
  width: 500,
  height: 240,
});
assert.equal(marker.hidden, true);
assert.equal(label.hidden, true);

const wrappedRight = markerPosition(2, 1);
assert.ok(Number.isFinite(wrappedRight.left));

const wrapMarker = makeElement();
const wrapLabel = makeElement();
const worldSize = getWorldSize(2);
positionMarker({
  marker: wrapMarker,
  label: wrapLabel,
  coordinates: { latitude: 0, longitude: -170 },
  centerPoint: { x: worldSize - 20, y: worldSize / 2 },
  zoom: 2,
  worldSize,
  width: 500,
  height: 240,
});
assert.ok(Number.parseFloat(wrapMarker.style.left) > 250);
positionMarker({
  marker: wrapMarker,
  label: wrapLabel,
  coordinates: { latitude: 0, longitude: 170 },
  centerPoint: { x: 20, y: worldSize / 2 },
  zoom: 2,
  worldSize,
  width: 500,
  height: 240,
});
assert.ok(Number.parseFloat(wrapMarker.style.left) < 250);

console.log('Map marker positioning tests passed.');
