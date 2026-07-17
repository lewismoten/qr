import assert from 'node:assert/strict';
import { projectCoordinates, unprojectPoint } from '../src/js/app/ui/content/geo/slippy-map.js';

assert.deepEqual(projectCoordinates({ latitude: 0, longitude: 0 }, 0), { x: 128, y: 128 });

const frontRoyal = { latitude: 38.9182, longitude: -78.1944 };
const roundTrip = unprojectPoint(projectCoordinates(frontRoyal, 15), 15);
assert.ok(Math.abs(roundTrip.latitude - frontRoyal.latitude) < 1e-10);
assert.ok(Math.abs(roundTrip.longitude - frontRoyal.longitude) < 1e-10);

const wrapped = unprojectPoint(projectCoordinates({ latitude: 0, longitude: 190 }, 4), 4);
assert.ok(Math.abs(wrapped.longitude + 170) < 1e-10);

const clamped = unprojectPoint(projectCoordinates({ latitude: 90, longitude: 0 }, 4), 4);
assert.ok(clamped.latitude <= 85.05112878);

console.log('Slippy map projection tests passed.');
