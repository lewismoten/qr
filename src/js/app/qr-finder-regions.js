export function isInSquare(row, column, top, left, size) {
  return (
    row >= top && row < top + size && column >= left && column < left + size
  );
}

export function isFinderPattern(size, row, column) {
  return (
    isInSquare(row, column, 0, 0, 7) ||
    isInSquare(row, column, 0, size - 7, 7) ||
    isInSquare(row, column, size - 7, 0, 7)
  );
}

export function getFinderPatternPart(size, row, column) {
  const origins = [
    [0, 0],
    [0, size - 7],
    [size - 7, 0],
  ];
  for (const [top, left] of origins) {
    if (!isInSquare(row, column, top, left, 7)) continue;
    const localRow = row - top;
    const localColumn = column - left;
    if (
      localRow >= 2 &&
      localRow <= 4 &&
      localColumn >= 2 &&
      localColumn <= 4
    ) {
      return 'center';
    }
    if (
      localRow === 0 ||
      localRow === 6 ||
      localColumn === 0 ||
      localColumn === 6
    ) {
      return 'outer';
    }
    return null;
  }
  return null;
}
