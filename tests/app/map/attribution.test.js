import assert from 'node:assert/strict';
import {
  createDynamicAttribution,
  hasVisibleCensusData,
  hasVisibleUsgsData,
} from '../../../src/js/app/ui/content/geo/data/attribution.js';
import * as ui from '../../../src/js/app/ui/content/geo/slippy-elements.js';

const censusView = {
  center: { latitude: 38.9182, longitude: -78.1944 },
  zoom: 7,
  width: 500,
  height: 250,
};

assert.equal(hasVisibleCensusData({ ...censusView, zoom: 5 }), false);
assert.equal(hasVisibleCensusData({ ...censusView, zoom: 6 }), true);
assert.equal(hasVisibleCensusData({ ...censusView, width: 0 }), false);
assert.equal(hasVisibleCensusData(censusView), true);
assert.equal(hasVisibleUsgsData({ ...censusView, zoom: 8 }), false);
assert.equal(hasVisibleUsgsData({ ...censusView, zoom: 9 }), true);
assert.equal(
  hasVisibleCensusData({
    ...censusView,
    center: { latitude: 48.8566, longitude: 2.3522 },
  }),
  false,
);

const documentDescriptor = Object.getOwnPropertyDescriptor(
  globalThis,
  'document',
);
const createNode = (tagName) => ({
  tagName,
  children: [],
  hidden: false,
  setAttribute(name, value) {
    this[name] = value;
  },
  append(...children) {
    this.children.push(...children);
  },
  appendChild(child) {
    this.children.push(child);
  },
});
Object.defineProperty(globalThis, 'document', {
  configurable: true,
  value: { createElement: createNode },
});

const attributedElement = ui.createElement('div', 'sample', { role: 'note' });
assert.equal(attributedElement.className, 'sample');
assert.equal(attributedElement.role, 'note');

let showCensus = false;
const attribution = createDynamicAttribution({
  text: 'Natural Earth',
  url: 'https://example.com/earth',
  secondary: {
    text: 'U.S. Census Bureau',
    url: 'https://example.com/census',
  },
  showSecondary: () => showCensus,
});
const secondary = attribution.element.children[1];
assert.equal(attribution.element.children[0].textContent, 'Natural Earth');
assert.equal(secondary.hidden, true);
attribution.update({});
assert.equal(secondary.hidden, true);
showCensus = true;
attribution.update({});
assert.equal(secondary.hidden, false);

const primaryOnly = createDynamicAttribution({
  text: 'OpenStreetMap',
  url: 'https://example.com/osm',
});
primaryOnly.update({});
assert.equal(primaryOnly.element.children.length, 1);

Object.defineProperty(
  globalThis,
  'document',
  documentDescriptor || { configurable: true, value: undefined },
);

console.log('Map attribution tests passed.');
