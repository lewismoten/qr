import path from 'node:path';

const MERCATOR_LATITUDE = 85.05112878;

const QUADRANTS = [
  {
    shard: 'south-west',
    bounds: [-180, -MERCATOR_LATITUDE, 0, 0],
  },
  {
    shard: 'south-east',
    bounds: [0, -MERCATOR_LATITUDE, 180, 0],
  },
  {
    shard: 'north-west',
    bounds: [-180, 0, 0, MERCATOR_LATITUDE],
  },
  {
    shard: 'north-east',
    bounds: [0, 0, 180, MERCATOR_LATITUDE],
  },
];

function shardFile(file, shard) {
  const parsed = path.parse(file);
  return path.join(parsed.dir, `${parsed.name}-${shard}${parsed.ext}`);
}

function splitLevel(level) {
  let allocated = 0;
  return QUADRANTS.map((quadrant, index) => {
    const final = index === QUADRANTS.length - 1;
    const budgetBytes = final
      ? level.budgetBytes - allocated
      : Math.floor(level.budgetBytes / QUADRANTS.length);
    allocated += budgetBytes;
    return {
      ...level,
      ...quadrant,
      budgetBytes,
      file: shardFile(level.file, quadrant.shard),
    };
  });
}

export function shardArchiveLevels(levels, minimumZoom = 9) {
  return levels.flatMap((level) => {
    return level.minimumZoom < minimumZoom ? level : splitLevel(level);
  });
}
