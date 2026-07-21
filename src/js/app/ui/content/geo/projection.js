export const TILE_SIZE = 256;
export const HALF_TURN_DEGREES = 180;
export const FULL_TURN_DEGREES = 360;
const MERCATOR_MAX_LATITUDE = 85.05112878;
const MERCATOR_VERTICAL_CENTER = 0.5;
const MERCATOR_LOG_DIVISOR = 4;
const MERCATOR_INVERSE_SCALE = 2;

export const clamp = (value, minimum, maximum) =>
  Math.min(maximum, Math.max(minimum, value));

export const normalizeLongitude = (value) =>
  ((((value + HALF_TURN_DEGREES) % FULL_TURN_DEGREES) + FULL_TURN_DEGREES) %
    FULL_TURN_DEGREES) -
  HALF_TURN_DEGREES;

export const getWorldSize = (zoom) => TILE_SIZE * 2 ** zoom;

export function projectCoordinates({ latitude, longitude }, zoom) {
  const worldSize = getWorldSize(zoom);
  const boundedLatitude = clamp(
    latitude,
    -MERCATOR_MAX_LATITUDE,
    MERCATOR_MAX_LATITUDE,
  );
  const sine = Math.sin((boundedLatitude * Math.PI) / HALF_TURN_DEGREES);
  return {
    x:
      ((normalizeLongitude(longitude) + HALF_TURN_DEGREES) /
        FULL_TURN_DEGREES) *
      worldSize,
    y:
      (MERCATOR_VERTICAL_CENTER -
        Math.log((1 + sine) / (1 - sine)) / (MERCATOR_LOG_DIVISOR * Math.PI)) *
      worldSize,
  };
}

export function unprojectPoint({ x, y }, zoom) {
  const worldSize = getWorldSize(zoom);
  const longitude = normalizeLongitude(
    (x / worldSize) * FULL_TURN_DEGREES - HALF_TURN_DEGREES,
  );
  const latitude =
    (Math.atan(
      Math.sinh(Math.PI * (1 - (MERCATOR_INVERSE_SCALE * y) / worldSize)),
    ) *
      HALF_TURN_DEGREES) /
    Math.PI;
  return {
    latitude: clamp(latitude, -MERCATOR_MAX_LATITUDE, MERCATOR_MAX_LATITUDE),
    longitude,
  };
}
