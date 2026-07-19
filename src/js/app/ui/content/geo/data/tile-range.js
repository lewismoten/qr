import { TILE_SIZE } from '../projection.js';

export function getVisibleTileRange({
  center,
  width,
  height,
  zoom,
  scale = 1,
  padding = TILE_SIZE,
}) {
  const maximumTile = 2 ** zoom - 1;
  const halfWidth = width / (2 * scale) + padding;
  const halfHeight = height / (2 * scale) + padding;
  return {
    firstX: Math.floor((center.x - halfWidth) / TILE_SIZE),
    lastX: Math.floor((center.x + halfWidth - 1) / TILE_SIZE),
    firstY: Math.max(0, Math.floor((center.y - halfHeight) / TILE_SIZE)),
    lastY: Math.min(
      maximumTile,
      Math.floor((center.y + halfHeight - 1) / TILE_SIZE),
    ),
  };
}
