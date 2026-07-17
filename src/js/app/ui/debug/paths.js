import { getContrastingHex, hexToRgba } from '../../colors.js';
import { getActiveOutlineGroups } from './boundaries.js';

function getMetadataOffset(routeIndex, cellSize) {
  const offset = Math.max(1.25, cellSize * 0.18);
  const vectors = [
    { x: -offset, y: -offset * 0.35 }, { x: offset, y: offset * 0.35 },
    { x: -offset * 0.6, y: offset }, { x: offset * 0.6, y: -offset },
  ];
  return vectors[((routeIndex % vectors.length) + vectors.length) % vectors.length];
}

function drawMetadataSegment(context, from, to, color, opacity, offset) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  const normal = length === 0
    ? offset
    : { x: (-dy / length) * offset.x + offset.x * 0.2, y: (dx / length) * offset.y + offset.y * 0.2 };
  context.strokeStyle = hexToRgba(color, opacity);
  context.beginPath();
  context.moveTo(from.x, from.y);
  context.quadraticCurveTo(
    (from.x + to.x) / 2 + normal.x,
    (from.y + to.y) / 2 + normal.y,
    to.x,
    to.y,
  );
  context.stroke();
}

function drawMetadataBridge(context, from, to, color, opacity, lineWidth, routeIndex, cellSize) {
  const direction = to.x >= from.x ? 1 : -1;
  const curveDirection = routeIndex % 2 === 0 ? -1 : 1;
  context.strokeStyle = hexToRgba(color, opacity);
  context.lineWidth = lineWidth;
  context.beginPath();
  context.moveTo(from.x, from.y);
  context.quadraticCurveTo(
    (from.x + to.x) / 2 + direction * Math.max(cellSize * 0.7, 7) * 0.2,
    Math.min(from.y, to.y) + curveDirection * Math.max(cellSize * 1.3, 12),
    to.x,
    to.y,
  );
  context.stroke();
}

export function drawCodewordPaths(
  context,
  qrDefinition,
  model,
  marginModules,
  cellSize,
  outlineMode,
  getModuleContrastColor,
) {
  const lineWidth = Math.max(1, cellSize * 0.18);
  const groups = getActiveOutlineGroups(model, outlineMode);
  groups.forEach((group, index) => {
    if (group.modules.length === 0) return;
    const points = group.modules.map(({ row, column }) => ({
      x: (column + marginModules + 0.5) * cellSize,
      y: (row + marginModules + 0.5) * cellSize,
    }));
    const strokeOpacity = group.kind === 'data' ? (index % 2 === 0 ? 0.25 : 0.5) : 0.5;
    const effectiveWidth = group.kind === 'metadata' ? Math.max(0.8, cellSize * 0.11) : lineWidth;
    context.lineWidth = effectiveWidth;
    context.lineJoin = 'round';
    context.lineCap = 'round';
    const routeIndex = group.kind === 'metadata' ? groups.indexOf(group) : -1;
    const offset = group.kind === 'metadata' ? getMetadataOffset(routeIndex, cellSize) : null;
    for (let pointIndex = 1; pointIndex < points.length; pointIndex += 1) {
      const color = getModuleContrastColor(group.modules[pointIndex], qrDefinition, model);
      if (group.kind === 'metadata') {
        drawMetadataSegment(context, points[pointIndex - 1], points[pointIndex], color, 0.78, offset);
      } else {
        context.strokeStyle = hexToRgba(color, strokeOpacity);
        context.beginPath();
        context.moveTo(points[pointIndex - 1].x, points[pointIndex - 1].y);
        context.lineTo(points[pointIndex].x, points[pointIndex].y);
        context.stroke();
      }
    }
    const nextGroup = groups[index + 1];
    if (!nextGroup?.modules.length) return;
    const from = points.at(-1);
    const next = nextGroup.modules[0];
    const to = {
      x: (next.column + marginModules + 0.5) * cellSize,
      y: (next.row + marginModules + 0.5) * cellSize,
    };
    const color = getModuleContrastColor(next, qrDefinition, model);
    if (group.kind === 'metadata' && nextGroup.kind === 'metadata') {
      if (group.metadataSequenceId !== nextGroup.metadataSequenceId) return;
      drawMetadataBridge(context, from, to, color, 0.78, Math.max(0.8, cellSize * 0.11), routeIndex, cellSize);
    } else if (group.kind !== 'metadata' && nextGroup.kind !== 'metadata') {
      context.strokeStyle = hexToRgba(color, strokeOpacity);
      context.lineWidth = Math.max(1, cellSize * 0.1);
      context.beginPath();
      context.moveTo(from.x, from.y);
      context.lineTo(to.x, to.y);
      context.stroke();
    }
  });
}

function getRoleCategory(role) {
  if (role === 'payload') return 'data';
  if (role === 'bytePad' || role === 'padByte') return 'padding';
  if (role === 'errorCorrection') return 'errorCorrection';
  return role;
}

export function drawStreamFieldStarts(context, model, marginModules, cellSize, outlineMode, colors) {
  if (outlineMode === 'metadata') return;
  model.fieldStarts.forEach(({ role, module }) => {
    if (!module) return;
    const category = getRoleCategory(role);
    const color = colors[category]?.value ?? colors.data.value;
    const contrast = getContrastingHex(color);
    const x = (module.column + marginModules + 0.5) * cellSize;
    const y = (module.row + marginModules + 0.5) * cellSize;
    context.fillStyle = hexToRgba(contrast, 0.95);
    context.beginPath();
    context.arc(x, y, Math.max(2, cellSize * 0.28), 0, Math.PI * 2);
    context.fill();
    context.fillStyle = hexToRgba(color, 0.95);
    context.beginPath();
    context.arc(x, y, Math.max(0.9, cellSize * 0.12), 0, Math.PI * 2);
    context.fill();
  });
}
