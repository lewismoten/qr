const DETAILED_ROWS = 3;

export function getTileLod({
  lastY,
  maxSourceZoom,
  minSourceZoom,
  x,
  y,
  zoom,
}) {
  const bestSourceZoom = Math.min(zoom, maxSourceZoom);
  const rowDistance = Math.max(0, lastY - y);
  const parentDepth = Math.max(0, rowDistance - DETAILED_ROWS + 1);
  const sourceZoom = Math.max(minSourceZoom, bestSourceZoom - parentDepth);
  return {
    key: `${zoom}:${x}:${y}@${sourceZoom}`,
    sourceZoom,
  };
}
