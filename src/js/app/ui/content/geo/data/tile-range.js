import { TILE_SIZE } from '../projection.js';

export function getVisibleTileRange({
  center,
  width,
  height,
  zoom,
  scale = 1,
  padding = TILE_SIZE,
  viewportBounds,
}) {
  const maximumTile = 2 ** zoom - 1;
  const bounds = viewportBounds || {
    bottom: height,
    left: 0,
    right: width,
    top: 0,
  };
  const firstOffsetX = (bounds.left - width / 2) / scale - padding;
  const lastOffsetX = (bounds.right - width / 2) / scale + padding;
  const firstOffsetY = (bounds.top - height / 2) / scale - padding;
  const lastOffsetY = (bounds.bottom - height / 2) / scale + padding;
  return {
    firstX: Math.floor((center.x + firstOffsetX) / TILE_SIZE),
    lastX: Math.floor((center.x + lastOffsetX - 1) / TILE_SIZE),
    firstY: Math.max(0, Math.floor((center.y + firstOffsetY) / TILE_SIZE)),
    lastY: Math.min(
      maximumTile,
      Math.floor((center.y + lastOffsetY - 1) / TILE_SIZE),
    ),
  };
}
