import {
  clamp,
  getWorldSize,
  projectCoordinates,
  unprojectPoint,
} from '../projection.js';

export function centerZoomAtPointer({
  center,
  offset,
  scale,
  zoom,
  nextScale,
  nextZoom,
}) {
  const centerPoint = projectCoordinates(center, zoom);
  const anchor = unprojectPoint(
    {
      x: centerPoint.x + offset.x / scale,
      y: centerPoint.y + offset.y / scale,
    },
    zoom,
  );
  const nextAnchor = projectCoordinates(anchor, nextZoom);
  const worldSize = getWorldSize(nextZoom);
  return unprojectPoint(
    {
      x: nextAnchor.x - offset.x / nextScale,
      y: clamp(nextAnchor.y - offset.y / nextScale, 0, worldSize),
    },
    nextZoom,
  );
}

export function centerZoomAtEvent(container, event, view) {
  if (!event) return view.center;
  const bounds = container.getBoundingClientRect();
  return centerZoomAtPointer({
    ...view,
    offset: {
      x: event.clientX - bounds.left - bounds.width / 2,
      y: event.clientY - bounds.top - bounds.height / 2,
    },
  });
}

export function coordinatesAtPointer(
  container,
  clientX,
  clientY,
  { center, scale, zoom },
) {
  const bounds = container.getBoundingClientRect();
  const centerPoint = projectCoordinates(center, zoom);
  return unprojectPoint(
    {
      x: centerPoint.x + (clientX - bounds.left - bounds.width / 2) / scale,
      y: centerPoint.y + (clientY - bounds.top - bounds.height / 2) / scale,
    },
    zoom,
  );
}
