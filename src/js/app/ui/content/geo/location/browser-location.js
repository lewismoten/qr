const LOCATION_TIMEOUT_MS = 15_000;
const MAXIMUM_CACHED_LOCATION_AGE_MS = 60_000;

export const LOCATION_FAILURE = Object.freeze({
  denied: 'denied',
  timeout: 'timeout',
  unavailable: 'unavailable',
  unsupported: 'unsupported',
});

const ERROR_REASONS = new Map([
  [1, LOCATION_FAILURE.denied],
  [2, LOCATION_FAILURE.unavailable],
  [3, LOCATION_FAILURE.timeout],
]);

function failure(reason, cause) {
  return Object.assign(new Error(reason, { cause }), { reason });
}

export function requestBrowserLocation(geolocation) {
  if (typeof geolocation?.getCurrentPosition !== 'function') {
    return Promise.reject(failure(LOCATION_FAILURE.unsupported));
  }
  return new Promise((resolve, reject) => {
    geolocation.getCurrentPosition(
      ({ coords }) => {
        const latitude = Number(coords?.latitude);
        const longitude = Number(coords?.longitude);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          reject(failure(LOCATION_FAILURE.unavailable));
          return;
        }
        resolve({ latitude, longitude });
      },
      (error) => {
        const reason =
          ERROR_REASONS.get(error?.code) || LOCATION_FAILURE.unavailable;
        reject(failure(reason, error));
      },
      {
        enableHighAccuracy: true,
        maximumAge: MAXIMUM_CACHED_LOCATION_AGE_MS,
        timeout: LOCATION_TIMEOUT_MS,
      },
    );
  });
}
