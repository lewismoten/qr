import {
  projectCoordinates,
  TILE_SIZE,
} from '../app/ui/content/geo/projection.js';

export const FRONT_ROYAL = {
  latitude: 38.9182,
  longitude: -78.1944,
};

export function getCenteredTileLayout(zoom, center = FRONT_ROYAL) {
  const point = projectCoordinates(center, zoom);
  const half = TILE_SIZE / 2;
  const firstX = Math.floor((point.x - half) / TILE_SIZE);
  const lastX = Math.floor((point.x + half - 1) / TILE_SIZE);
  const firstY = Math.max(0, Math.floor((point.y - half) / TILE_SIZE));
  const maximumY = 2 ** zoom - 1;
  const lastY = Math.min(
    maximumY,
    Math.floor((point.y + half - 1) / TILE_SIZE),
  );
  const centerX = Math.floor(point.x / TILE_SIZE);
  const centerY = Math.floor(point.y / TILE_SIZE);
  const tiles = [];

  for (let y = firstY; y <= lastY; y += 1) {
    for (let x = firstX; x <= lastX; x += 1) {
      tiles.push({
        isCenter: x === centerX && y === centerY,
        left: ((x * TILE_SIZE - point.x + half) / TILE_SIZE) * 100,
        tile: { zoom, x, y },
        top: ((y * TILE_SIZE - point.y + half) / TILE_SIZE) * 100,
      });
    }
  }

  return { centerTile: { zoom, x: centerX, y: centerY }, tiles };
}
