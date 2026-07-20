const MAXIMUM_HILBERT_ZOOM = 26;
const HILBERT_ROTATION_FACTOR = 3;
const HILBERT_SERIES_DIVISOR = 3;

function rotate(size, point, rx, ry) {
  if (ry) return point;
  const next = { ...point };
  if (rx) {
    next.x = size - 1 - next.x;
    next.y = size - 1 - next.y;
  }
  [next.x, next.y] = [next.y, next.x];
  return next;
}

export function zxyToTileId(zoom, x, y) {
  const size = 2 ** zoom;
  if (
    !Number.isInteger(zoom) ||
    zoom < 0 ||
    zoom > MAXIMUM_HILBERT_ZOOM ||
    !Number.isInteger(x) ||
    !Number.isInteger(y) ||
    x < 0 ||
    y < 0 ||
    x >= size ||
    y >= size
  ) {
    throw new RangeError('Invalid PMTiles tile coordinate.');
  }
  let point = { x, y };
  let position = 0;
  for (let scale = size / 2; scale >= 1; scale /= 2) {
    const rx = (point.x & scale) > 0 ? 1 : 0;
    const ry = (point.y & scale) > 0 ? 1 : 0;
    position += scale * scale * ((HILBERT_ROTATION_FACTOR * rx) ^ ry);
    point = rotate(scale, point, rx, ry);
  }
  return (size * size - 1) / HILBERT_SERIES_DIVISOR + position;
}
