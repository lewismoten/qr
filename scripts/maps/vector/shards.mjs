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

function splitLevel(level, grid) {
  const count = grid ** 2;
  let allocated = 0;
  const shards = [];
  for (let row = grid - 1; row >= 0; row -= 1) {
    for (let column = 0; column < grid; column += 1) {
      const final = shards.length === count - 1;
      const budgetBytes = final
        ? level.budgetBytes - allocated
        : Math.floor(level.budgetBytes / count);
      const shard = shardName(column, row, grid);
      allocated += budgetBytes;
      shards.push({
        ...level,
        shard,
        shardGrid: grid,
        shardColumn: column,
        shardRow: row,
        bounds: shardBounds(column, row, grid),
        budgetBytes,
        file: shardFile(level.file, shard),
      });
    }
  }
  return shards;
}

export function shardArchiveLevels(
  levels,
  minimumZoom = 9,
  deepMinimumZoom = 13,
) {
  if (deepMinimumZoom < minimumZoom) {
    throw new RangeError('Deep shard zoom cannot precede shard zoom.');
  }
  return levels.flatMap((level) => {
    if (level.minimumZoom < minimumZoom) return level;
    const grid = level.minimumZoom < deepMinimumZoom ? 2 : 4;
    return splitLevel(level, grid);
  });
}
