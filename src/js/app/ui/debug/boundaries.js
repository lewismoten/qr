import { getContrastingHex, hexToRgba } from '../../colors.js';
import { coordKey } from '../../qr/qr-regions.js';
import { getDebugCategory } from './model.js';

function getOverlayColor(category, colors) {
  return colors[category]?.value ?? colors.data.value;
}

export function drawHighlightedBoundaries(
  context,
  qrDefinition,
  model,
  marginModules,
  cellSize,
  colors,
) {
  const size = qrDefinition.modules.size;
  const lineWidth = Math.max(0.8, cellSize * 0.08);
  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      const category = getDebugCategory(
        row,
        column,
        qrDefinition,
        model,
        'overlay',
      );
      if (category === 'data') continue;
      const left = (column + marginModules) * cellSize;
      const top = (row + marginModules) * cellSize;
      const right = left + cellSize;
      const bottom = top + cellSize;
      const neighbors = {
        left:
          column > 0
            ? getDebugCategory(row, column - 1, qrDefinition, model, 'overlay')
            : null,
        right:
          column < size - 1
            ? getDebugCategory(row, column + 1, qrDefinition, model, 'overlay')
            : null,
        top:
          row > 0
            ? getDebugCategory(row - 1, column, qrDefinition, model, 'overlay')
            : null,
        bottom:
          row < size - 1
            ? getDebugCategory(row + 1, column, qrDefinition, model, 'overlay')
            : null,
      };
      context.strokeStyle = hexToRgba(
        getContrastingHex(getOverlayColor(category, colors)),
        0.75,
      );
      context.lineWidth = lineWidth;
      context.lineCap = 'round';
      for (const [edge, differs] of [
        [[left, top, left, bottom], neighbors.left !== category],
        [[right, top, right, bottom], neighbors.right !== category],
        [[left, top, right, top], neighbors.top !== category],
        [[left, bottom, right, bottom], neighbors.bottom !== category],
      ]) {
        if (!differs) continue;
        context.beginPath();
        context.moveTo(edge[0], edge[1]);
        context.lineTo(edge[2], edge[3]);
        context.stroke();
      }
    }
  }
}

export function getActiveOutlineGroups(model, mode) {
  if (mode === 'stream') return model.streamGroups;
  if (mode === 'units') return model.encodingUnitGroups;
  if (mode === 'metadata') return model.metadataGroups;
  return model.codewords;
}

function drawSegmentPerimeter(
  context,
  modules,
  marginModules,
  cellSize,
  strokeStyle,
  lineWidth,
) {
  const moduleSet = new Set(
    modules.map(({ row, column }) => coordKey(row, column)),
  );
  context.strokeStyle = strokeStyle;
  context.lineWidth = lineWidth;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  modules.forEach(({ row, column }) => {
    const left = (column + marginModules) * cellSize;
    const top = (row + marginModules) * cellSize;
    const right = left + cellSize;
    const bottom = top + cellSize;
    for (const [edge, adjacent] of [
      [[left, top, left, bottom], coordKey(row, column - 1)],
      [[right, top, right, bottom], coordKey(row, column + 1)],
      [[left, top, right, top], coordKey(row - 1, column)],
      [[left, bottom, right, bottom], coordKey(row + 1, column)],
    ]) {
      if (moduleSet.has(adjacent)) continue;
      context.beginPath();
      context.moveTo(edge[0], edge[1]);
      context.lineTo(edge[2], edge[3]);
      context.stroke();
    }
  });
}

export function drawCodewordOutlines(
  context,
  model,
  marginModules,
  cellSize,
  outlineMode,
  getStyle,
) {
  const lineWidth = Math.max(1.25, cellSize * 0.14);
  const groups = getActiveOutlineGroups(model, outlineMode);
  const outlinedKinds = new Set([
    'header',
    'data',
    'errorCorrection',
    'metadata',
  ]);
  if (outlineMode === 'codewords') outlinedKinds.add('padding').add('padByte');
  groups.forEach((group, index) => {
    if (group.modules.length === 0) return;
    const style = getStyle(group);
    if (outlinedKinds.has(group.kind)) {
      drawSegmentPerimeter(
        context,
        group.modules,
        marginModules,
        cellSize,
        hexToRgba(style.strokeColor, Math.min(1, style.opacity + 0.18)),
        lineWidth,
      );
    }
    const previous = groups[index - 1];
    const metadataStart =
      group.kind === 'metadata' &&
      (!previous || previous.metadataSequenceId !== group.metadataSequenceId);
    const drawStart =
      outlinedKinds.has(group.kind) &&
      (group.kind !== 'metadata' || metadataStart);
    const first = group.modules[0];
    if (!first || !drawStart) return;
    context.fillStyle = hexToRgba(
      style.strokeColor,
      Math.min(1, style.opacity + 0.1),
    );
    context.beginPath();
    context.arc(
      (first.column + marginModules + 0.5) * cellSize,
      (first.row + marginModules + 0.5) * cellSize,
      Math.max(
        group.kind === 'metadata' ? 2.2 : 1.4,
        cellSize * (group.kind === 'metadata' ? 0.24 : 0.18),
      ),
      0,
      Math.PI * 2,
    );
    context.fill();
  });
}
