function scoreLine(modules, startRow, startColumn, rowStep, columnStep) {
  let row = startRow;
  let column = startColumn;
  let run = 1;
  let penalty = 0;
  let current = modules[row][column];
  let pattern = current ? 1 : 0;
  let darkCount = current ? 1 : 0;
  for (let index = 1; index < modules.length; index += 1) {
    row += rowStep;
    column += columnStep;
    const previous = current;
    current = modules[row][column];
    if (current === previous) run += 1;
    else {
      if (run >= 5) penalty += run - 2;
      run = 1;
    }
    pattern = ((pattern << 1) | (current ? 1 : 0)) & 0x7ff;
    if (index >= 10 && (pattern === 0x05d || pattern === 0x5d0)) penalty += 40;
    if (current) darkCount += 1;
  }
  if (run >= 5) penalty += run - 2;
  return { penalty, darkCount };
}

export function getPenalty(modules) {
  const size = modules.length;
  let result = 0;
  let darkCount = 0;
  for (let row = 0; row < size; row += 1) {
    const line = scoreLine(modules, row, 0, 0, 1);
    result += line.penalty;
    darkCount += line.darkCount;
  }
  for (let column = 0; column < size; column += 1) {
    result += scoreLine(modules, 0, column, 1, 0).penalty;
  }
  for (let row = 0; row < size - 1; row += 1) {
    for (let column = 0; column < size - 1; column += 1) {
      const color = modules[row][column];
      if (
        color === modules[row][column + 1] &&
        color === modules[row + 1][column] &&
        color === modules[row + 1][column + 1]
      )
        result += 3;
    }
  }
  const darkPercentage = (darkCount * 100) / (size * size);
  result += Math.floor(Math.abs(darkPercentage - 50) / 5) * 10;
  return result;
}
