import path from 'node:path';

const MERCATOR_LATITUDE = 85.05112878;
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
  return (Math.atan(Math.sinh(mercator)) * 180) / Math.PI;
}

function shardName(column, row, grid) {
  if (grid === 2) return QUADRANT_NAMES.get(`${column},${row}`);
  return `g${grid}-x${column}-y${row}`;
}

function shardBounds(column, row, grid) {
  const width = 360 / grid;
  return [
    -180 + column * width,
    latitudeAtRow(row + 1, grid),
    -180 + (column + 1) * width,
    latitudeAtRow(row, grid),
  ];
}

function regionLevel(level, grid, column, row, weight) {
  if (grid === 1) return { ...level, weight };
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
  };
}

export function adaptiveSplitFactor(bytes, targetBytes) {
  if (!Number.isFinite(targetBytes) || targetBytes <= 0) {
    throw new RangeError('Shard target must be greater than zero.');
  }
  if (bytes <= targetBytes) return 1;
  const depth = Math.ceil(Math.log(bytes / targetBytes) / Math.log(4));
  return 2 ** Math.max(1, depth);
}

function expandRegion(level, parent, targetBytes) {
  const parentGrid = parent.shardGrid ?? 1;
  const parentColumn = parent.shardColumn ?? 0;
  const parentRow = parent.shardRow ?? 0;
  const requested = adaptiveSplitFactor(parent.bytes, targetBytes);
  const maximumFactor = Math.max(1, 2 ** level.minimumZoom / parentGrid);
  const factor = Math.min(requested, maximumFactor);
  const childGrid = parentGrid * factor;
  const childWeight = parent.bytes / factor ** 2;
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
        ),
      );
    }
  }
  return children;
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
  { minimumZoom = 9, targetBytes = 10 * 1024 * 1024 } = {},
) {
  if (level.minimumZoom < minimumZoom) return [level];
  const parents = previousResults.length
    ? previousResults
    : [{ bytes: targetBytes + 1 }];
  const regions = parents.flatMap((parent) => {
    return expandRegion(level, parent, targetBytes);
  });
  return allocateBudgets(regions, level.budgetBytes);
}
