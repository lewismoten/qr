export const MAXIMUM_LATITUDE = 90;
export const MINIMUM_LATITUDE = -MAXIMUM_LATITUDE;
export const MAXIMUM_LONGITUDE = 180;
export const MINIMUM_LONGITUDE = -MAXIMUM_LONGITUDE;

export function parseCoordinate(value) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}
