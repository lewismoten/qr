const DETAILED_ROWS = 3;

export function getTileLod({
  lastY,
  maximumSourceZoom,
  minimumSourceZoom,
  x,
  y,
  zoom,
}) {
  const bestSourceZoom = Math.min(zoom, maximumSourceZoom);
  const rowDistance = Math.max(0, lastY - y);
  const parentDepth = Math.max(0, rowDistance - DETAILED_ROWS + 1);
  const sourceZoom = Math.max(minimumSourceZoom, bestSourceZoom - parentDepth);
  return {
    key: `${zoom}:${x}:${y}@${sourceZoom}`,
    sourceZoom,
  };
}
