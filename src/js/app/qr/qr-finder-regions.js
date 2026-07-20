export function isInSquare(row, column, top, left, size) {
  return (
    row >= top && row < top + size && column >= left && column < left + size
  );
}

export function isFinderPattern(size, row, column) {
  return (
    isInSquare(row, column, 0, 0, FINDER_PATTERN_SIZE) ||
    isInSquare(
      row,
      column,
      0,
      size - FINDER_PATTERN_SIZE,
      FINDER_PATTERN_SIZE,
    ) ||
    isInSquare(row, column, size - FINDER_PATTERN_SIZE, 0, FINDER_PATTERN_SIZE)
  );
}

export function getFinderPatternPart(size, row, column) {
  const origins = [
    [0, 0],
    [0, size - FINDER_PATTERN_SIZE],
    [size - FINDER_PATTERN_SIZE, 0],
  ];
  for (const [top, left] of origins) {
    if (!isInSquare(row, column, top, left, FINDER_PATTERN_SIZE)) continue;
    const localRow = row - top;
    const localColumn = column - left;
    if (
      localRow >= FINDER_CENTER_START &&
      localRow <= FINDER_CENTER_END &&
      localColumn >= FINDER_CENTER_START &&
      localColumn <= FINDER_CENTER_END
    ) {
      return 'center';
    }
    if (
      localRow === 0 ||
      localRow === FINDER_OUTER_END ||
      localColumn === 0 ||
      localColumn === FINDER_OUTER_END
    ) {
      return 'outer';
    }
    return null;
  }
  return null;
}
const FINDER_PATTERN_SIZE = 7;
const FINDER_CENTER_START = 2;
const FINDER_CENTER_END = 4;
const FINDER_OUTER_END = FINDER_PATTERN_SIZE - 1;
