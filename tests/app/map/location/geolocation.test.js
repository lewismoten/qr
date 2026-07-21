import assert from 'node:assert/strict';
import test from 'node:test';

import {
  LOCATION_FAILURE,
  requestBrowserLocation,
} from '../../../../src/js/app/ui/content/geo/location/browser-location.js';

test('requests an accurate cached browser location', async () => {
  let requestedOptions;
  const location = await requestBrowserLocation({
    getCurrentPosition(success, _failure, options) {
      requestedOptions = options;
      success({ coords: { latitude: 38.9182, longitude: -78.1944 } });
    },
  });

  assert.deepEqual(location, { latitude: 38.9182, longitude: -78.1944 });
  assert.equal(requestedOptions.enableHighAccuracy, true);
  assert.ok(requestedOptions.maximumAge > 0);
  assert.ok(requestedOptions.timeout > 0);
});

test('normalizes browser location failures', async () => {
  for (const [code, reason] of [
    [1, LOCATION_FAILURE.denied],
    [2, LOCATION_FAILURE.unavailable],
    [3, LOCATION_FAILURE.timeout],
  ]) {
    await assert.rejects(
      requestBrowserLocation({
        getCurrentPosition(_success, failure) {
          failure({ code });
        },
      }),
      (error) => error.reason === reason,
    );
  }
  await assert.rejects(
    requestBrowserLocation({
      getCurrentPosition(_success, failure) {
        failure(null);
      },
    }),
    (error) =>
      error.reason === LOCATION_FAILURE.unavailable && error.cause === null,
  );
  await assert.rejects(
    requestBrowserLocation(null),
    (error) => error.reason === LOCATION_FAILURE.unsupported,
  );
});

test('rejects unusable coordinates from the browser', async () => {
  await assert.rejects(
    requestBrowserLocation({
      getCurrentPosition(success) {
        success({ coords: { latitude: Number.NaN, longitude: 0 } });
      },
    }),
    (error) => error.reason === LOCATION_FAILURE.unavailable,
  );
  await assert.rejects(
    requestBrowserLocation({
      getCurrentPosition(success) {
        success({});
      },
    }),
    (error) => error.reason === LOCATION_FAILURE.unavailable,
  );
});
