const workspaces = new Map();

function getWorkspace(size) {
  if (!workspaces.has(size)) {
    workspaces.set(size, {
      colors: new Uint8Array(size),
      patterns: new Uint16Array(size),
      runs: new Uint16Array(size),
    });
  }
  return workspaces.get(size);
}

function hasFinderLikePattern(pattern) {
  return pattern === 0x05d || pattern === 0x5d0;
}

export function getPenalty(modules) {
  const size = modules.length;
  const workspace = getWorkspace(size);
  const columnColors = workspace.colors;
  const columnPatterns = workspace.patterns;
  const columnRuns = workspace.runs;
  let result = 0;
  let darkCount = 0;

  for (let row = 0; row < size; row += 1) {
    const currentRow = modules[row];
    const previousRow = modules[row - 1];
    let rowColor = currentRow[0];
    let rowPattern = rowColor;
    let rowRun = 1;

    for (let column = 0; column < size; column += 1) {
      const dark = currentRow[column];
      if (dark) darkCount += 1;

      if (column > 0) {
        if (dark === rowColor) rowRun += 1;
        else {
          if (rowRun >= 5) result += rowRun - 2;
          rowColor = dark;
          rowRun = 1;
        }
        rowPattern = ((rowPattern << 1) | dark) & 0x7ff;
        if (column >= 10 && hasFinderLikePattern(rowPattern)) result += 40;
      }

      if (row === 0) {
        columnColors[column] = dark;
        columnPatterns[column] = dark;
        columnRuns[column] = 1;
      } else {
        if (dark === columnColors[column]) columnRuns[column] += 1;
        else {
          if (columnRuns[column] >= 5) result += columnRuns[column] - 2;
          columnColors[column] = dark;
          columnRuns[column] = 1;
        }
        const pattern = ((columnPatterns[column] << 1) | dark) & 0x7ff;
        columnPatterns[column] = pattern;
        if (row >= 10 && hasFinderLikePattern(pattern)) result += 40;

        if (
          column > 0 &&
          dark === currentRow[column - 1] &&
          dark === previousRow[column] &&
          dark === previousRow[column - 1]
        )
          result += 3;
      }
    }
    if (rowRun >= 5) result += rowRun - 2;
  }

  for (let column = 0; column < size; column += 1) {
    if (columnRuns[column] >= 5) result += columnRuns[column] - 2;
  }
  const darkPercentage = (darkCount * 100) / (size * size);
  result += Math.floor(Math.abs(darkPercentage - 50) / 5) * 10;
  return result;
}
