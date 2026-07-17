export const TILE_SIZE = 256;
const MAX_LATITUDE = 85.05112878;

export const clamp = (value, minimum, maximum) =>
  Math.min(maximum, Math.max(minimum, value));

const normalizeLongitude = (value) =>
  ((((value + 180) % 360) + 360) % 360) - 180;

export const getWorldSize = (zoom) => TILE_SIZE * 2 ** zoom;

export function projectCoordinates({ latitude, longitude }, zoom) {
  const worldSize = getWorldSize(zoom);
  const boundedLatitude = clamp(latitude, -MAX_LATITUDE, MAX_LATITUDE);
  const sine = Math.sin((boundedLatitude * Math.PI) / 180);
  return {
    x: ((normalizeLongitude(longitude) + 180) / 360) * worldSize,
    y: (0.5 - Math.log((1 + sine) / (1 - sine)) / (4 * Math.PI)) * worldSize,
  };
}

export function unprojectPoint({ x, y }, zoom) {
  const worldSize = getWorldSize(zoom);
  const longitude = normalizeLongitude((x / worldSize) * 360 - 180);
  const latitude =
    (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / worldSize))) * 180) / Math.PI;
  return {
    latitude: clamp(latitude, -MAX_LATITUDE, MAX_LATITUDE),
    longitude,
  };
}
