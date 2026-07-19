function containsRow(ranges, y) {
  if (!Array.isArray(ranges)) return false;
  for (let index = 0; index < ranges.length; index += 2) {
    if (y >= ranges[index] && y <= ranges[index + 1]) return true;
  }
  return false;
}

export function createTileAvailability(manifest) {
  const availability = manifest.tileAvailability;
  if (!availability || typeof availability !== 'object') return null;
  return ({ zoom, x, y }) => {
    if (!Number.isInteger(zoom) || !Number.isInteger(x)) return false;
    if (!Number.isInteger(y) || y < 0 || y >= 2 ** zoom) return false;
    const count = 2 ** zoom;
    const wrappedX = ((x % count) + count) % count;
    return containsRow(availability[zoom]?.[wrappedX], y);
  };
}
