const maskMaps = new Map();

export function isMaskActive(mask, row, column) {
  switch (mask) {
    case 0:
      return (row + column) % 2 === 0;
    case 1:
      return row % 2 === 0;
    case 2:
      return column % 3 === 0;
    case 3:
      return (row + column) % 3 === 0;
    case 4:
      return (Math.floor(row / 2) + Math.floor(column / 3)) % 2 === 0;
    case 5:
      return ((row * column) % 2) + ((row * column) % 3) === 0;
    case 6:
      return (((row * column) % 2) + ((row * column) % 3)) % 2 === 0;
    case 7:
      return (((row + column) % 2) + ((row * column) % 3)) % 2 === 0;
    default:
      return false;
  }
}

export function getMaskMap(size, mask) {
  const key = size * 8 + mask;
  const cached = maskMaps.get(key);
  if (cached) return cached;
  const result = new Uint8Array(size * size);
  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      result[row * size + column] = isMaskActive(mask, row, column) ? 1 : 0;
    }
  }
  maskMaps.set(key, result);
  return result;
}
