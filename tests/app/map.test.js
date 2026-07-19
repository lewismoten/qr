import assert from 'node:assert/strict';
import {
  projectCoordinates,
  unprojectPoint,
} from '../../src/js/app/ui/content/geo/projection.js';
import {
  hasOpenStreetMapConsent,
  OPENSTREETMAP_CONSENT_KEY,
  rememberOpenStreetMapConsent,
} from '../../src/js/app/ui/content/geo/map-consent.js';
import {
  coordinatesToWorldPoint,
  createWorldMap,
  worldPointToCoordinates,
} from '../../src/js/app/ui/content/geo/world-map.js';
import { hasVisibleCensusCounties } from '../../src/js/app/ui/content/geo/data/attribution.js';

assert.deepEqual(projectCoordinates({ latitude: 0, longitude: 0 }, 0), {
  x: 128,
  y: 128,
});

const frontRoyal = { latitude: 38.9182, longitude: -78.1944 };
const roundTrip = unprojectPoint(projectCoordinates(frontRoyal, 15), 15);
assert.ok(Math.abs(roundTrip.latitude - frontRoyal.latitude) < 1e-10);
assert.ok(Math.abs(roundTrip.longitude - frontRoyal.longitude) < 1e-10);

const wrapped = unprojectPoint(
  projectCoordinates({ latitude: 0, longitude: 190 }, 4),
  4,
);
assert.ok(Math.abs(wrapped.longitude + 170) < 1e-10);

const clamped = unprojectPoint(
  projectCoordinates({ latitude: 90, longitude: 0 }, 4),
  4,
);
assert.ok(clamped.latitude <= 85.05112878);

const worldPoint = coordinatesToWorldPoint(frontRoyal);
const worldRoundTrip = worldPointToCoordinates(worldPoint);
assert.ok(Math.abs(worldRoundTrip.latitude - frontRoyal.latitude) < 1e-10);
assert.ok(Math.abs(worldRoundTrip.longitude - frontRoyal.longitude) < 1e-10);
const wrappedWorldPoint = coordinatesToWorldPoint({
  latitude: 100,
  longitude: 190,
});
assert.ok(Math.abs(wrappedWorldPoint.x - 27.77777777777778) < 1e-10);
assert.equal(wrappedWorldPoint.y, 0);
assert.deepEqual(worldPointToCoordinates({ x: -10, y: 600 }), {
  latitude: -90,
  longitude: -180,
});
let clickHandler;
let worldWheelHandler;
let zoomHandler;
let selected;
const marker = {
  hidden: true,
  setAttribute(name, value) {
    this[name] = value;
  },
};
const label = { hidden: true, style: {}, textContent: '' };
const surface = { hidden: true };
const overlay = { hidden: true };
const zoomControls = { hidden: true };
const attribution = { hidden: true };
const zoomIn = {
  addEventListener(name, handler) {
    assert.equal(name, 'click');
    zoomHandler = handler;
  },
};
const detail = { hidden: true };
const detailCalls = [];
let detailView = { center: { latitude: 0, longitude: 0 }, zoom: 1 };
let slippyOptions;
const detailMap = {
  getView: () => detailView,
  setMarker(...values) {
    detailCalls.push(['marker', ...values]);
  },
  setView(center, zoom = detailView.zoom) {
    detailView = { center, zoom };
    detailCalls.push(['view', center, zoom]);
  },
};
const container = {
  addEventListener(name, handler, options) {
    if (name === 'click') clickHandler = handler;
    else {
      assert.equal(name, 'wheel');
      assert.deepEqual(options, { passive: false });
      worldWheelHandler = handler;
    }
  },
  getBoundingClientRect: () => ({ left: 10, top: 20, width: 500, height: 250 }),
};
const worldMap = createWorldMap(
  {
    ...container,
    querySelector(selector) {
      const elements = {
        '.geo-world-surface': surface,
        '.geo-world-overlay': overlay,
        '#geo-world-marker': marker,
        '#geo-world-label': label,
        '#geo-world-zoom-controls': zoomControls,
        '#geo-world-zoom-in': zoomIn,
        '#geo-world-attribution': attribution,
        '#geo-local-map': detail,
      };
      return elements[selector];
    },
  },
  {
    onSelect: (coordinates) => (selected = coordinates),
    loadSlippyMap: async () => ({
      createSlippyMap(_element, options) {
        assert.equal(_element, detail);
        slippyOptions = options;
        return detailMap;
      },
    }),
    loadTileRange: async () => ({ minimum: 1, maximum: 6 }),
  },
);
assert.equal(surface.hidden, false);
assert.equal(overlay.hidden, false);
assert.equal(zoomControls.hidden, false);
assert.equal(attribution.hidden, false);
assert.equal(detail.hidden, true);
clickHandler({ clientX: 260, clientY: 145 });
assert.deepEqual(selected, { latitude: 0, longitude: 0 });
clickHandler({
  clientX: 10,
  clientY: 20,
  target: { closest: () => true },
});
assert.deepEqual(selected, { latitude: 0, longitude: 0 });
assert.equal(worldMap.getView(), null);
worldWheelHandler({
  deltaMode: 0,
  deltaY: -100,
  preventDefault() {},
  timeStamp: 0,
});
await new Promise((resolve) => setTimeout(resolve, 0));
assert.deepEqual(slippyOptions.center, { latitude: 0, longitude: 0 });
assert.equal(slippyOptions.zoom, 1);
assert.equal(detailView.zoom, 2);
assert.equal(attribution.hidden, true);
slippyOptions.onMinimumZoomOut();
assert.equal(attribution.hidden, false);
worldMap.setMarker(frontRoyal, 'Front Royal, VA');
assert.equal(marker.hidden, false);
assert.match(marker.transform, /^translate\(/);
assert.equal(label.hidden, false);
assert.equal(label.textContent, 'Front Royal, VA');
assert.match(label.style.left, /%$/);
assert.match(label.style.top, /%$/);
zoomHandler();
await new Promise((resolve) => setTimeout(resolve, 0));
assert.equal(surface.hidden, true);
assert.equal(overlay.hidden, true);
assert.equal(detail.hidden, false);
assert.equal(slippyOptions.tileUrl, '/maps/tiles/{z}/{x}/{y}.svg');
assert.equal(slippyOptions.minimumZoom, 1);
assert.equal(slippyOptions.minimumSourceZoom, 1);
assert.equal(slippyOptions.maximumSourceZoom, 6);
assert.equal(slippyOptions.attributionText, 'Natural Earth');
assert.equal(slippyOptions.secondaryAttribution.text, 'U.S. Census Bureau');
assert.equal(slippyOptions.showSecondaryAttribution, hasVisibleCensusCounties);
assert.deepEqual(detailCalls.at(-1), ['marker', frontRoyal, 'Front Royal, VA']);
assert.deepEqual(worldMap.getView(), { center: frontRoyal, zoom: 2 });
const nextMarker = { latitude: 39.115, longitude: -77.565 };
worldMap.setMarker(nextMarker, 'Next marker');
assert.deepEqual(detailCalls.at(-1), ['marker', nextMarker, 'Next marker']);
assert.equal(marker.hidden, true);
assert.equal(label.hidden, true);
worldMap.setMarker(frontRoyal, 'Front Royal, VA');
assert.deepEqual(detailCalls.at(-1), ['marker', frontRoyal, 'Front Royal, VA']);
assert.equal(label.hidden, true);
const transferredView = {
  center: { latitude: 40.7128, longitude: -74.006 },
  zoom: 7,
};
await worldMap.showDetail(transferredView);
assert.deepEqual(worldMap.getView(), transferredView);
worldMap.setMarker(null);
assert.deepEqual(detailCalls.at(-1), ['marker', null, '']);
slippyOptions.onMinimumZoomOut();
assert.equal(surface.hidden, false);
assert.equal(detail.hidden, true);
zoomHandler();
await new Promise((resolve) => setTimeout(resolve, 0));
assert.deepEqual(detailCalls.at(-1), ['marker', null, '']);
slippyOptions.onMinimumZoomOut();
assert.equal(marker.hidden, true);
assert.equal(label.hidden, true);

let failedZoomHandler;
let loadError;
const failedElements = {
  '.geo-world-surface': { hidden: false },
  '.geo-world-overlay': { hidden: false },
  '#geo-world-marker': { hidden: true, setAttribute() {} },
  '#geo-world-label': { hidden: true, textContent: '' },
  '#geo-world-zoom-controls': { hidden: false },
  '#geo-world-attribution': { hidden: false },
  '#geo-world-zoom-in': {
    addEventListener(_name, handler) {
      failedZoomHandler = handler;
    },
  },
  '#geo-local-map': { hidden: true },
};
createWorldMap(
  {
    addEventListener() {},
    querySelector: (selector) => failedElements[selector],
  },
  {
    onSelect() {},
    loadSlippyMap: async () => {
      throw new Error('offline');
    },
    loadTileRange: async () => ({ minimum: 1, maximum: 6 }),
    onLoadError: (error) => {
      loadError = error;
    },
  },
);
failedZoomHandler();
await new Promise((resolve) => setTimeout(resolve, 0));
assert.equal(loadError.message, 'offline');
assert.equal(failedElements['.geo-world-surface'].hidden, false);
assert.equal(failedElements['#geo-local-map'].hidden, true);

const values = new Map();
const storage = {
  getItem: (key) => values.get(key),
  setItem: (key, value) => values.set(key, value),
};
assert.equal(hasOpenStreetMapConsent(storage), false);
assert.equal(rememberOpenStreetMapConsent(storage), true);
assert.equal(values.get(OPENSTREETMAP_CONSENT_KEY), 'allow');
assert.equal(hasOpenStreetMapConsent(storage), true);
assert.equal(hasOpenStreetMapConsent(), false);
assert.equal(rememberOpenStreetMapConsent(), false);
const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
Object.defineProperty(globalThis, 'window', {
  configurable: true,
  value: { localStorage: storage },
});
assert.equal(hasOpenStreetMapConsent(), true);
assert.equal(rememberOpenStreetMapConsent(), true);
Object.defineProperty(globalThis, 'window', {
  configurable: true,
  value: {
    get localStorage() {
      throw new Error('blocked');
    },
  },
});
assert.equal(hasOpenStreetMapConsent(), false);
assert.equal(rememberOpenStreetMapConsent(), false);
Object.defineProperty(
  globalThis,
  'window',
  windowDescriptor || { configurable: true, value: undefined },
);
const unavailableStorage = {
  getItem() {
    throw new Error('unavailable');
  },
  setItem() {
    throw new Error('unavailable');
  },
};
assert.equal(hasOpenStreetMapConsent(unavailableStorage), false);
assert.equal(rememberOpenStreetMapConsent(unavailableStorage), false);

console.log('Slippy map projection tests passed.');
