import path from 'node:path';

const MERCATOR_LATITUDE = 85.05112878;
const DEGREES_PER_HALF_TURN = 180;
const DEGREES_PER_TURN = 360;
const QUADTREE_CHILDREN = 4;
const DEFAULT_SHARD_TARGET_MIB = 100;
const KIBIBYTE = 1024;
const MEBIBYTE = KIBIBYTE * KIBIBYTE;
const QUADRANT_NAMES = new Map([
  ['0,0', 'north-west'],
  ['1,0', 'north-east'],
  ['0,1', 'south-west'],
  ['1,1', 'south-east'],
]);

function shardFile(file, shard) {
  const parsed = path.parse(file);
  return path.join(parsed.dir, `${parsed.name}-${shard}${parsed.ext}`);
}

export function levelShardLabel(level) {
  const zoom = `z${level.minimumZoom}`;
  return level.shard ? `${zoom} ${level.shard}` : zoom;
}

function latitudeAtRow(row, grid) {
  if (row === 0) return MERCATOR_LATITUDE;
  if (row === grid) return -MERCATOR_LATITUDE;
  const mercator = Math.PI * (1 - (2 * row) / grid);
  return (Math.atan(Math.sinh(mercator)) * DEGREES_PER_HALF_TURN) / Math.PI;
}

function shardName(column, row, grid) {
  if (grid === 2) return QUADRANT_NAMES.get(`${column},${row}`);
  return `g${grid}-x${column}-y${row}`;
}

function shardBounds(column, row, grid) {
  const width = DEGREES_PER_TURN / grid;
  return [
    -DEGREES_PER_HALF_TURN + column * width,
    latitudeAtRow(row + 1, grid),
    -DEGREES_PER_HALF_TURN + (column + 1) * width,
    latitudeAtRow(row, grid),
  ];
}

function regionLevel(
  level,
  grid,
  column,
  row,
  weight,
  forecastBytes,
  forecastMultiplier,
) {
  if (grid === 1) {
    return { ...level, weight, forecastBytes, forecastMultiplier };
  }
  const shard = shardName(column, row, grid);
  return {
    ...level,
    shard,
    shardGrid: grid,
    shardColumn: column,
    shardRow: row,
    bounds: shardBounds(column, row, grid),
    file: shardFile(level.file, shard),
    weight,
    forecastBytes,
    forecastMultiplier,
  };
}

export function adaptiveSplitFactor(bytes, targetBytes) {
  if (!Number.isFinite(targetBytes) || targetBytes <= 0) {
    throw new RangeError('Shard target must be greater than zero.');
  }
  if (bytes <= targetBytes) return 1;
  const depth = Math.ceil(
    Math.log(bytes / targetBytes) / Math.log(QUADTREE_CHILDREN),
  );
  return 2 ** Math.max(1, depth);
}

function expandRegion(level, parent, targetBytes, forecastMultiplier) {
  const parentGrid = parent.shardGrid ?? 1;
  const parentColumn = parent.shardColumn ?? 0;
  const parentRow = parent.shardRow ?? 0;
  const multiplier =
    typeof forecastMultiplier === 'function'
      ? forecastMultiplier(parent)
      : forecastMultiplier;
  const naturalBytes = parent.naturalBytes ?? parent.bytes;
  const projectedBytes = naturalBytes * multiplier;
  const requested = adaptiveSplitFactor(projectedBytes, targetBytes);
  const maximumFactor = Math.max(1, 2 ** level.minimumZoom / parentGrid);
  const factor = Math.min(requested, maximumFactor);
  const childGrid = parentGrid * factor;
  const childWeight = (naturalBytes || targetBytes) / factor ** 2;
  const forecastBytes = projectedBytes / factor ** 2;
  const children = [];
  for (let row = factor - 1; row >= 0; row -= 1) {
    for (let column = 0; column < factor; column += 1) {
      children.push(
        regionLevel(
          level,
          childGrid,
          parentColumn * factor + column,
          parentRow * factor + row,
          childWeight,
          forecastBytes,
          multiplier,
        ),
      );
    }
  }
  return children;
}

function projectedRegion(parent, forecastMultiplier) {
  const multiplier =
    typeof forecastMultiplier === 'function'
      ? forecastMultiplier(parent)
      : forecastMultiplier;
  const naturalBytes = parent.naturalBytes ?? parent.bytes;
  return {
    ...parent,
    projectedBytes: naturalBytes * multiplier,
    forecastMultiplier: multiplier,
  };
}

function siblingKey(region) {
  const grid = region.shardGrid ?? 1;
  if (grid === 1) return null;
  return [
    grid,
    Math.floor((region.shardColumn ?? 0) / 2),
    Math.floor((region.shardRow ?? 0) / 2),
  ].join(':');
}

function mergeSiblings(siblings) {
  const child = siblings[0];
  const grid = (child.shardGrid ?? 1) / 2;
  const naturalBytes = siblings.reduce((sum, item) => {
    return sum + (item.naturalBytes ?? item.bytes);
  }, 0);
  const bytes = siblings.reduce((sum, item) => sum + item.bytes, 0);
  const projectedBytes = siblings.reduce((sum, item) => {
    return sum + item.projectedBytes;
  }, 0);
  if (grid === 1) return { bytes, naturalBytes, projectedBytes };
  return {
    bytes,
    naturalBytes,
    projectedBytes,
    shardGrid: grid,
    shardColumn: Math.floor((child.shardColumn ?? 0) / 2),
    shardRow: Math.floor((child.shardRow ?? 0) / 2),
  };
}

function coalesceRegions(parents, targetBytes, forecastMultiplier) {
  let regions = parents.map((parent) => {
    return projectedRegion(parent, forecastMultiplier);
  });
  let changed = true;
  while (changed) {
    changed = false;
    const groups = Map.groupBy(regions, siblingKey);
    const replacements = new Map();
    for (const [key, siblings] of groups) {
      if (key == null || siblings.length !== QUADTREE_CHILDREN) continue;
      const positions = new Set(
        siblings.map((item) => {
          return `${item.shardColumn % 2},${item.shardRow % 2}`;
        }),
      );
      const projectedBytes = siblings.reduce((sum, item) => {
        return sum + item.projectedBytes;
      }, 0);
      const cannotMerge =
        positions.size !== QUADTREE_CHILDREN || projectedBytes > targetBytes;
      if (cannotMerge) {
        continue;
      }
      replacements.set(key, mergeSiblings(siblings));
      changed = true;
    }
    if (changed) {
      const emitted = new Set();
      regions = regions.flatMap((region) => {
        const key = siblingKey(region);
        const replacement = replacements.get(key);
        if (!replacement || emitted.has(key)) {
          return replacement ? [] : [region];
        }
        emitted.add(key);
        return [replacement];
      });
    }
  }
  return regions;
}

function allocateBudgets(levels, totalBytes) {
  const weight = levels.reduce((sum, level) => sum + level.weight, 0);
  let allocated = 0;
  return levels.map((level, index) => {
    const final = index === levels.length - 1;
    const budgetBytes = final
      ? totalBytes - allocated
      : Math.floor((totalBytes * level.weight) / weight);
    allocated += budgetBytes;
    const { weight: _weight, ...result } = level;
    return { ...result, budgetBytes };
  });
}

export function planAdaptiveShardLevel(
  level,
  previousResults,
  {
    minimumZoom = 9,
    targetBytes = DEFAULT_SHARD_TARGET_MIB * MEBIBYTE,
    targetVariance = 0,
    forecastMultiplier = 1,
  } = {},
) {
  if (level.minimumZoom < minimumZoom) return [level];
  const inherited = previousResults.length
    ? previousResults
    : [{ bytes: targetBytes + 1 }];
  const softTargetBytes = targetBytes * (1 + targetVariance);
  const parents = coalesceRegions(
    inherited,
    softTargetBytes,
    forecastMultiplier,
  );
  const regions = parents.flatMap((parent) => {
    return expandRegion(level, parent, softTargetBytes, forecastMultiplier);
  });
  return allocateBudgets(regions, level.budgetBytes);
}
