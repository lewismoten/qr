import assert from 'node:assert/strict';
import test from 'node:test';

import { parseGeoNamesText } from '../../scripts/maps/sources/geonames.mjs';

const row = ({ id, name, latitude, longitude, code, population }) =>
  [
    id,
    name,
    name,
    '',
    latitude,
    longitude,
    'P',
    code,
    'US',
    '',
    'VA',
    '',
    '',
    '',
    population,
    '',
    '',
    'America/New_York',
    '2026-01-01',
  ].join('\t');

test('converts GeoNames rows and ranks places by map zoom', () => {
  const collection = parseGeoNamesText(
    [
      row({
        id: '1',
        name: 'Capital',
        latitude: '38.9',
        longitude: '-77',
        code: 'PPLC',
        population: '100',
      }),
      row({
        id: '2',
        name: 'Town',
        latitude: '38.9',
        longitude: '-78.2',
        code: 'PPL',
        population: '15000',
      }),
    ].join('\n'),
    2,
  );

  assert.equal(collection.features.length, 2);
  assert.deepEqual(collection.features[0].geometry.coordinates, [-77, 38.9]);
  assert.equal(collection.features[0].properties.min_zoom, 7);
  assert.equal(collection.features[1].properties.min_zoom, 9);
  assert.equal(collection.features[1].properties.name, 'Town');
  assert.equal(collection.features[1].properties.source_version, 2);
});
