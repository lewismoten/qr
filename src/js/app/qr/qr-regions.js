import { isInSquare } from './qr-finder-regions.js';

const MODULES_PER_VERSION = 4;
const BASE_MATRIX_SIZE = 17;
const ALIGNMENT_VERSION_INTERVAL = 7;
const ALIGNMENT_BASE_COUNT = 2;
const ALIGNMENT_SPECIAL_SIZE = 145;
const ALIGNMENT_SPECIAL_STEP = 26;
const ALIGNMENT_FIRST_CENTER = 6;
const ALIGNMENT_EDGE_INSET = 7;
const ALIGNMENT_STEP_INSET = 13;
const ALIGNMENT_RADIUS = 2;
const FINDER_REGION_SIZE = 8;
const TIMING_LINE = 6;
const FORMAT_LINE = 8;
const FUNCTION_END_INSET = 9;
const VERSION_MINIMUM = 7;
const VERSION_AREA_SIZE = 6;
const VERSION_START_INSET = 11;
const VERSION_END_INSET = 9;
const DATA_COLUMN_PAIR_SIZE = 2;
const EC_LEVEL_BIT_COUNT = 2;
const MASK_PATTERN_BIT_COUNT = 3;

export function coordKey(row, column) {
  return `${row},${column}`;
}

export function getAlignmentPatternCenters(version) {
  if (version === 1) {
    return [];
  }

  const size = version * MODULES_PER_VERSION + BASE_MATRIX_SIZE;
  const count =
    Math.floor(version / ALIGNMENT_VERSION_INTERVAL) + ALIGNMENT_BASE_COUNT;
  const step =
    size === ALIGNMENT_SPECIAL_SIZE
      ? ALIGNMENT_SPECIAL_STEP
      : Math.ceil(
          (size - ALIGNMENT_STEP_INSET) /
            (count * ALIGNMENT_BASE_COUNT - ALIGNMENT_BASE_COUNT),
        ) * ALIGNMENT_BASE_COUNT;
  const centers = [ALIGNMENT_FIRST_CENTER];

  for (
    let pos = size - ALIGNMENT_EDGE_INSET;
    centers.length < count;
    pos -= step
  ) {
    centers.splice(1, 0, pos);
  }

  return centers;
}

export function isFinderRegion(size, row, column) {
  return (
    isInSquare(row, column, 0, 0, FINDER_REGION_SIZE) ||
    isInSquare(row, column, 0, size - FINDER_REGION_SIZE, FINDER_REGION_SIZE) ||
    isInSquare(row, column, size - FINDER_REGION_SIZE, 0, FINDER_REGION_SIZE)
  );
}

export function isTimingRegion(size, row, column) {
  if (
    row === TIMING_LINE &&
    column >= FORMAT_LINE &&
    column <= size - FUNCTION_END_INSET
  ) {
    return true;
  }
  if (
    column === TIMING_LINE &&
    row >= FORMAT_LINE &&
    row <= size - FUNCTION_END_INSET
  ) {
    return true;
  }
  return false;
}

export function isFormatRegion(size, row, column) {
  const topLeftRow =
    row === FORMAT_LINE && column <= FORMAT_LINE && column !== TIMING_LINE;
  const topLeftColumn =
    column === FORMAT_LINE && row <= FORMAT_LINE && row !== TIMING_LINE;
  const topRight = row === FORMAT_LINE && column >= size - FINDER_REGION_SIZE;
  const bottomLeft =
    column === FORMAT_LINE && row >= size - ALIGNMENT_EDGE_INSET;
  return (
    topLeftRow ||
    topLeftColumn ||
    topRight ||
    bottomLeft ||
    (row === size - FINDER_REGION_SIZE && column === FORMAT_LINE)
  );
}

export function isVersionRegion(size, version, row, column) {
  if (version < VERSION_MINIMUM) {
    return false;
  }
  return (
    (row < VERSION_AREA_SIZE &&
      column >= size - VERSION_START_INSET &&
      column <= size - VERSION_END_INSET) ||
    (column < VERSION_AREA_SIZE &&
      row >= size - VERSION_START_INSET &&
      row <= size - VERSION_END_INSET)
  );
}

export function isDarkModuleRegion(size, row, column) {
  return row === size - FINDER_REGION_SIZE && column === FORMAT_LINE;
}

export function getFormatInfoCoordinates(size) {
  const primary = [];
  const secondary = [];
  for (let column = 0; column <= FORMAT_LINE; column += 1) {
    if (column !== TIMING_LINE) primary.push([FORMAT_LINE, column]);
  }
  for (let row = FORMAT_LINE - 1; row >= 0; row -= 1) {
    if (row !== TIMING_LINE) primary.push([row, FORMAT_LINE]);
  }
  for (let offset = 1; offset <= ALIGNMENT_EDGE_INSET; offset += 1) {
    secondary.push([size - offset, FORMAT_LINE]);
  }
  for (let offset = FINDER_REGION_SIZE; offset >= 1; offset -= 1) {
    secondary.push([FORMAT_LINE, size - offset]);
  }
  return { primary, secondary };
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

  for (let column = size - 1; column > 0; column -= DATA_COLUMN_PAIR_SIZE) {
    if (column === TIMING_LINE) {
      column -= 1;
    }

    for (let offset = 0; offset < size; offset += 1) {
      const row = upward ? size - 1 - offset : offset;

      for (let pair = 0; pair < DATA_COLUMN_PAIR_SIZE; pair += 1) {
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
      .slice(0, EC_LEVEL_BIT_COUNT)
      .forEach(([row, column]) => ecLevelBits.add(coordKey(row, column)));
    coords
      .slice(EC_LEVEL_BIT_COUNT, EC_LEVEL_BIT_COUNT + MASK_PATTERN_BIT_COUNT)
      .forEach(([row, column]) => maskBits.add(coordKey(row, column)));
  });

  return { ecLevelBits, maskBits };
}

export function getVersionInfoCoordinates(size) {
  const primary = [];
  const secondary = [];

  for (let row = 0; row < VERSION_AREA_SIZE; row += 1) {
    for (
      let column = size - VERSION_START_INSET;
      column <= size - VERSION_END_INSET;
      column += 1
    ) {
      primary.push([row, column]);
    }
  }

  for (let column = 0; column < VERSION_AREA_SIZE; column += 1) {
    for (
      let row = size - VERSION_START_INSET;
      row <= size - VERSION_END_INSET;
      row += 1
    ) {
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
        (centerRow === ALIGNMENT_FIRST_CENTER &&
          centerColumn === ALIGNMENT_FIRST_CENTER) ||
        (centerRow === ALIGNMENT_FIRST_CENTER &&
          centerColumn === size - ALIGNMENT_EDGE_INSET) ||
        (centerRow === size - ALIGNMENT_EDGE_INSET &&
          centerColumn === ALIGNMENT_FIRST_CENTER);

      if (overlapsFinder) {
        continue;
      }

      if (
        Math.abs(row - centerRow) <= ALIGNMENT_RADIUS &&
        Math.abs(column - centerColumn) <= ALIGNMENT_RADIUS
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
export {
  getFinderPatternPart,
  isFinderPattern,
  isInSquare,
} from './qr-finder-regions.js';
