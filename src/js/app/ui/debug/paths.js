import { getContrastingHex, hexToRgba } from '../../colors.js';
import { QR_STREAM_GROUP, QR_STREAM_ROLE } from '../../qr/qr-stream.js';
import { getActiveOutlineGroups } from './boundaries.js';

const METADATA_ROUTE_STYLE = {
  minimumOffset: 1.25,
  offsetScale: 0.18,
  shallowScale: 0.35,
  steepScale: 0.6,
  normalNudge: 0.2,
  bridgeXScale: 0.7,
  bridgeXMin: 7,
  bridgeYScale: 1.3,
  bridgeYMin: 12,
  opacity: 0.78,
  minimumLineWidth: 0.8,
  lineWidthScale: 0.11,
};
const CODEWORD_PATH_STYLE = {
  minimumLineWidth: 1,
  lineWidthScale: 0.18,
  connectorScale: 0.1,
  primaryOpacity: 0.25,
  secondaryOpacity: 0.5,
  otherOpacity: 0.5,
};
const FIELD_START_STYLE = {
  opacity: 0.95,
  outerMinRadius: 2,
  outerRadiusScale: 0.28,
  innerMinRadius: 0.9,
  innerRadiusScale: 0.12,
};
const MODULE_CENTER_OFFSET = 0.5;

function getMetadataOffset(routeIndex, cellSize) {
  const offset = Math.max(
    METADATA_ROUTE_STYLE.minimumOffset,
    cellSize * METADATA_ROUTE_STYLE.offsetScale,
  );
  const vectors = [
    {
      x: -offset,
      y: -offset * METADATA_ROUTE_STYLE.shallowScale,
    },
    { x: offset, y: offset * METADATA_ROUTE_STYLE.shallowScale },
    { x: -offset * METADATA_ROUTE_STYLE.steepScale, y: offset },
    { x: offset * METADATA_ROUTE_STYLE.steepScale, y: -offset },
  ];
  return vectors[
    ((routeIndex % vectors.length) + vectors.length) % vectors.length
  ];
}

function drawMetadataSegment(context, from, to, color, opacity, offset) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  const normal =
    length === 0
      ? offset
      : {
          x:
            (-dy / length) * offset.x +
            offset.x * METADATA_ROUTE_STYLE.normalNudge,
          y:
            (dx / length) * offset.y +
            offset.y * METADATA_ROUTE_STYLE.normalNudge,
        };
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

function drawMetadataBridge(
  context,
  from,
  to,
  color,
  opacity,
  lineWidth,
  routeIndex,
  cellSize,
) {
  const direction = to.x >= from.x ? 1 : -1;
  const curveDirection = routeIndex % 2 === 0 ? -1 : 1;
  context.strokeStyle = hexToRgba(color, opacity);
  context.lineWidth = lineWidth;
  context.beginPath();
  context.moveTo(from.x, from.y);
  context.quadraticCurveTo(
    (from.x + to.x) / 2 +
      direction *
        Math.max(
          cellSize * METADATA_ROUTE_STYLE.bridgeXScale,
          METADATA_ROUTE_STYLE.bridgeXMin,
        ) *
        METADATA_ROUTE_STYLE.normalNudge,
    Math.min(from.y, to.y) +
      curveDirection *
        Math.max(
          cellSize * METADATA_ROUTE_STYLE.bridgeYScale,
          METADATA_ROUTE_STYLE.bridgeYMin,
        ),
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
  const lineWidth = Math.max(
    CODEWORD_PATH_STYLE.minimumLineWidth,
    cellSize * CODEWORD_PATH_STYLE.lineWidthScale,
  );
  const groups = getActiveOutlineGroups(model, outlineMode);
  groups.forEach((group, index) => {
    if (group.modules.length === 0) return;
    const points = group.modules.map(({ row, column }) => ({
      x: (column + marginModules + MODULE_CENTER_OFFSET) * cellSize,
      y: (row + marginModules + MODULE_CENTER_OFFSET) * cellSize,
    }));
    const strokeOpacity =
      group.kind === 'data'
        ? index % 2 === 0
          ? CODEWORD_PATH_STYLE.primaryOpacity
          : CODEWORD_PATH_STYLE.secondaryOpacity
        : CODEWORD_PATH_STYLE.otherOpacity;
    const effectiveWidth =
      group.kind === 'metadata'
        ? Math.max(
            METADATA_ROUTE_STYLE.minimumLineWidth,
            cellSize * METADATA_ROUTE_STYLE.lineWidthScale,
          )
        : lineWidth;
    context.lineWidth = effectiveWidth;
    context.lineJoin = 'round';
    context.lineCap = 'round';
    const routeIndex = group.kind === 'metadata' ? groups.indexOf(group) : -1;
    const offset =
      group.kind === 'metadata'
        ? getMetadataOffset(routeIndex, cellSize)
        : null;
    for (let pointIndex = 1; pointIndex < points.length; pointIndex += 1) {
      const color = getModuleContrastColor(
        group.modules[pointIndex],
        qrDefinition,
        model,
      );
      if (group.kind === 'metadata') {
        drawMetadataSegment(
          context,
          points[pointIndex - 1],
          points[pointIndex],
          color,
          METADATA_ROUTE_STYLE.opacity,
          offset,
        );
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
      x: (next.column + marginModules + MODULE_CENTER_OFFSET) * cellSize,
      y: (next.row + marginModules + MODULE_CENTER_OFFSET) * cellSize,
    };
    const color = getModuleContrastColor(next, qrDefinition, model);
    if (group.kind === 'metadata' && nextGroup.kind === 'metadata') {
      if (group.metadataSequenceId !== nextGroup.metadataSequenceId) return;
      drawMetadataBridge(
        context,
        from,
        to,
        color,
        METADATA_ROUTE_STYLE.opacity,
        Math.max(
          METADATA_ROUTE_STYLE.minimumLineWidth,
          cellSize * METADATA_ROUTE_STYLE.lineWidthScale,
        ),
        routeIndex,
        cellSize,
      );
    } else if (group.kind !== 'metadata' && nextGroup.kind !== 'metadata') {
      context.strokeStyle = hexToRgba(color, strokeOpacity);
      context.lineWidth = Math.max(
        CODEWORD_PATH_STYLE.minimumLineWidth,
        cellSize * CODEWORD_PATH_STYLE.connectorScale,
      );
      context.beginPath();
      context.moveTo(from.x, from.y);
      context.lineTo(to.x, to.y);
      context.stroke();
    }
  });
}

function getRoleCategory(role) {
  if (role === QR_STREAM_ROLE.payload) return QR_STREAM_GROUP.data;
  if (
    role === QR_STREAM_ROLE.byteAlignment ||
    role === QR_STREAM_ROLE.paddingCodeword
  ) {
    return QR_STREAM_GROUP.padding;
  }
  if (role === QR_STREAM_ROLE.errorCorrection) {
    return QR_STREAM_ROLE.errorCorrection;
  }
  return role;
}

export function drawStreamFieldStarts(
  context,
  model,
  marginModules,
  cellSize,
  outlineMode,
  colors,
) {
  if (outlineMode === 'metadata') return;
  model.fieldStarts.forEach(({ role, module }) => {
    if (!module) return;
    const category = getRoleCategory(role);
    const color = colors[category]?.value ?? colors.data.value;
    const contrast = getContrastingHex(color);
    const x = (module.column + marginModules + MODULE_CENTER_OFFSET) * cellSize;
    const y = (module.row + marginModules + MODULE_CENTER_OFFSET) * cellSize;
    context.fillStyle = hexToRgba(contrast, FIELD_START_STYLE.opacity);
    context.beginPath();
    context.arc(
      x,
      y,
      Math.max(
        FIELD_START_STYLE.outerMinRadius,
        cellSize * FIELD_START_STYLE.outerRadiusScale,
      ),
      0,
      Math.PI * 2,
    );
    context.fill();
    context.fillStyle = hexToRgba(color, FIELD_START_STYLE.opacity);
    context.beginPath();
    context.arc(
      x,
      y,
      Math.max(
        FIELD_START_STYLE.innerMinRadius,
        cellSize * FIELD_START_STYLE.innerRadiusScale,
      ),
      0,
      Math.PI * 2,
    );
    context.fill();
  });
}
