import { projectCoordinates } from '../projection.js';

export function positionMarker({
  marker,
  label,
  coordinates,
  centerPoint,
  zoom,
  worldSize,
  width,
  height,
  scale = 1,
  projectPoint = (point) => point,
}) {
  if (!coordinates) {
    marker.hidden = true;
    label.hidden = true;
    return;
  }
  const point = projectCoordinates(coordinates, zoom);
  let deltaX = point.x - centerPoint.x;
  if (deltaX > worldSize / 2) deltaX -= worldSize;
  if (deltaX < -worldSize / 2) deltaX += worldSize;
  const screenPoint = projectPoint({
    x: width / 2 + deltaX * scale,
    y: height / 2 + (point.y - centerPoint.y) * scale,
  });
  marker.hidden = false;
  marker.style.left = `${screenPoint.x}px`;
  marker.style.top = `${screenPoint.y}px`;
  label.style.left = `${screenPoint.x}px`;
  label.style.top = `${screenPoint.y}px`;
}
