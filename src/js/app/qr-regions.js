export function coordKey(row, column) {
  return `${row},${column}`;
}

export function getAlignmentPatternCenters(version) {
  if (version === 1) {
    return [];
  }

  const size = version * 4 + 17;
  const count = Math.floor(version / 7) + 2;
  const step = size === 145 ? 26 : Math.ceil((size - 13) / (count * 2 - 2)) * 2;
  const centers = [6];

  for (let pos = size - 7; centers.length < count; pos -= step) {
    centers.splice(1, 0, pos);
  }

  return centers;
}

export function isInSquare(row, column, top, left, size) {
  return (
    row >= top && row < top + size && column >= left && column < left + size
  );
}

export function isFinderRegion(size, row, column) {
  return (
    isInSquare(row, column, 0, 0, 8) ||
    isInSquare(row, column, 0, size - 8, 8) ||
    isInSquare(row, column, size - 8, 0, 8)
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
    if (!isInSquare(row, column, top, left, 7)) {
      continue;
    }
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

export function isTimingRegion(size, row, column) {
  if (row === 6 && column >= 8 && column <= size - 9) {
    return true;
  }
  if (column === 6 && row >= 8 && row <= size - 9) {
    return true;
  }
  return false;
}

export function isFormatRegion(size, row, column) {
  const topLeftRow = row === 8 && column <= 8 && column !== 6;
  const topLeftColumn = column === 8 && row <= 8 && row !== 6;
  const topRight = row === 8 && column >= size - 8;
  const bottomLeft = column === 8 && row >= size - 7;
  return (
    topLeftRow ||
    topLeftColumn ||
    topRight ||
    bottomLeft ||
    (row === size - 8 && column === 8)
  );
}

export function isVersionRegion(size, version, row, column) {
  if (version < 7) {
    return false;
  }
  return (
    (row < 6 && column >= size - 11 && column <= size - 9) ||
    (column < 6 && row >= size - 11 && row <= size - 9)
  );
}

export function isDarkModuleRegion(size, row, column) {
  return row === size - 8 && column === 8;
}

export function getFormatInfoCoordinates(size) {
  return {
    primary: [
      [8, 0],
      [8, 1],
      [8, 2],
      [8, 3],
      [8, 4],
      [8, 5],
      [8, 7],
      [8, 8],
      [7, 8],
      [5, 8],
      [4, 8],
      [3, 8],
      [2, 8],
      [1, 8],
      [0, 8],
    ],
    secondary: [
      [size - 1, 8],
      [size - 2, 8],
      [size - 3, 8],
      [size - 4, 8],
      [size - 5, 8],
      [size - 6, 8],
      [size - 7, 8],
      [8, size - 8],
      [8, size - 7],
      [8, size - 6],
      [8, size - 5],
      [8, size - 4],
      [8, size - 3],
      [8, size - 2],
      [8, size - 1],
    ],
  };
}

export function isFunctionModule(qrDefinition, row, column) {
  const size = qrDefinition.modules.size;
  const version = qrDefinition.version;

  return (
    isFinderRegion(size, row, column) ||
    isTimingRegion(size, row, column) ||
    isFormatRegion(size, row, column) ||
    isVersionRegion(size, version, row, column) ||
    isAlignmentRegion(version, size, row, column) ||
    isDarkModuleRegion(size, row, column)
  );
}

export function getDataTraversal(qrDefinition) {
  const size = qrDefinition.modules.size;
  const traversal = [];
  let upward = true;

  for (let column = size - 1; column > 0; column -= 2) {
    if (column === 6) {
      column -= 1;
    }

    for (let offset = 0; offset < size; offset += 1) {
      const row = upward ? size - 1 - offset : offset;

      for (let pair = 0; pair < 2; pair += 1) {
        const currentColumn = column - pair;
        if (isFunctionModule(qrDefinition, row, currentColumn)) {
          continue;
        }

        traversal.push({ row, column: currentColumn });
      }
    }

    upward = !upward;
  }

  return traversal;
}

export function getFormatBitGroups(size) {
  const { primary, secondary } = getFormatInfoCoordinates(size);
  const ecLevelBits = new Set();
  const maskBits = new Set();

  [primary, secondary].forEach((coords) => {
    coords
      .slice(0, 2)
      .forEach(([row, column]) => ecLevelBits.add(coordKey(row, column)));
    coords
      .slice(2, 5)
      .forEach(([row, column]) => maskBits.add(coordKey(row, column)));
  });

  return { ecLevelBits, maskBits };
}

export function getVersionInfoCoordinates(size) {
  const primary = [];
  const secondary = [];

  for (let row = 0; row < 6; row += 1) {
    for (let column = size - 11; column <= size - 9; column += 1) {
      primary.push([row, column]);
    }
  }

  for (let column = 0; column < 6; column += 1) {
    for (let row = size - 11; row <= size - 9; row += 1) {
      secondary.push([row, column]);
    }
  }

  return { primary, secondary };
}

export function isAlignmentRegion(version, size, row, column) {
  const centers = getAlignmentPatternCenters(version);
  for (const centerRow of centers) {
    for (const centerColumn of centers) {
      const overlapsFinder =
        (centerRow === 6 && centerColumn === 6) ||
        (centerRow === 6 && centerColumn === size - 7) ||
        (centerRow === size - 7 && centerColumn === 6);

      if (overlapsFinder) {
        continue;
      }

      if (
        Math.abs(row - centerRow) <= 2 &&
        Math.abs(column - centerColumn) <= 2
      ) {
        return true;
      }
    }
  }
  return false;
}

export function getModuleCategory(qrDefinition, row, column) {
  const size = qrDefinition.modules.size;
  const version = qrDefinition.version;

  if (isFinderRegion(size, row, column)) {
    return 'finder';
  }
  if (isTimingRegion(size, row, column)) {
    return 'timing';
  }
  if (isDarkModuleRegion(size, row, column)) {
    return 'darkModule';
  }
  if (isFormatRegion(size, row, column)) {
    return 'format';
  }
  if (isVersionRegion(size, version, row, column)) {
    return 'version';
  }
  if (isAlignmentRegion(version, size, row, column)) {
    return 'alignment';
  }
  return 'data';
}
