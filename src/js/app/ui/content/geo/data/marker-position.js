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
  const left = width / 2 + deltaX;
  const top = height / 2 + point.y - centerPoint.y;
  marker.hidden = false;
  marker.style.left = `${left}px`;
  marker.style.top = `${top}px`;
  label.style.left = `${left}px`;
  label.style.top = `${top}px`;
}
