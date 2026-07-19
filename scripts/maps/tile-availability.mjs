function getLevel(index, zoom) {
  let level = index.get(zoom);
  if (!level) {
    level = new Map();
    index.set(zoom, level);
  }
  return level;
}

export function addAvailableTile(index, { zoom, x, y }) {
  const level = getLevel(index, zoom);
  let rows = level.get(x);
  if (!rows) {
    rows = new Set();
    level.set(x, rows);
  }
  rows.add(y);
}

function compressRows(rows) {
  const sorted = [...rows].sort((left, right) => left - right);
  const ranges = [];
  let start = sorted[0];
  let end = start;
  for (let index = 1; index < sorted.length; index += 1) {
    const row = sorted[index];
    if (row === end + 1) {
      end = row;
      continue;
    }
    ranges.push(start, end);
    start = row;
    end = row;
  }
  if (start !== undefined) ranges.push(start, end);
  return ranges;
}

export function serializeTileAvailability(index) {
  const result = {};
  for (const [zoom, columns] of [...index].sort(([a], [b]) => a - b)) {
    const level = {};
    for (const [x, rows] of [...columns].sort(([a], [b]) => a - b)) {
      level[x] = compressRows(rows);
    }
    result[zoom] = level;
  }
  return result;
}
