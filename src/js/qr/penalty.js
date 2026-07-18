const DARK_COUNT_BITS = 8;
const DARK_COUNT_MASK = (1 << DARK_COUNT_BITS) - 1;

function scoreRow(modules) {
  let run = 1;
  let penalty = 0;
  let current = modules[0];
  let pattern = current ? 1 : 0;
  let darkCount = current ? 1 : 0;
  for (let column = 1; column < modules.length; column += 1) {
    const previous = current;
    current = modules[column];
    if (current === previous) run += 1;
    else {
      if (run >= 5) penalty += run - 2;
      run = 1;
    }
    pattern = ((pattern << 1) | (current ? 1 : 0)) & 0x7ff;
    if (column >= 10 && (pattern === 0x05d || pattern === 0x5d0)) penalty += 40;
    if (current) darkCount += 1;
  }
  if (run >= 5) penalty += run - 2;
  return (penalty << DARK_COUNT_BITS) | darkCount;
}

function scoreColumn(modules, column) {
  let run = 1;
  let penalty = 0;
  let current = modules[0][column];
  let pattern = current ? 1 : 0;
  for (let row = 1; row < modules.length; row += 1) {
    const previous = current;
    current = modules[row][column];
    if (current === previous) run += 1;
    else {
      if (run >= 5) penalty += run - 2;
      run = 1;
    }
    pattern = ((pattern << 1) | (current ? 1 : 0)) & 0x7ff;
    if (row >= 10 && (pattern === 0x05d || pattern === 0x5d0)) penalty += 40;
  }
  if (run >= 5) penalty += run - 2;
  return penalty;
}

export function getPenalty(modules) {
  const size = modules.length;
  let result = 0;
  let darkCount = 0;
  for (let row = 0; row < size; row += 1) {
    const line = scoreRow(modules[row]);
    result += line >>> DARK_COUNT_BITS;
    darkCount += line & DARK_COUNT_MASK;
  }
  for (let column = 0; column < size; column += 1)
    result += scoreColumn(modules, column);
  for (let row = 0; row < size - 1; row += 1) {
    const currentRow = modules[row];
    const nextRow = modules[row + 1];
    for (let column = 0; column < size - 1; column += 1) {
      const color = currentRow[column];
      if (
        color === currentRow[column + 1] &&
        color === nextRow[column] &&
        color === nextRow[column + 1]
      )
        result += 3;
    }
  }
  const darkPercentage = (darkCount * 100) / (size * size);
  result += Math.floor(Math.abs(darkPercentage - 50) / 5) * 10;
  return result;
}
