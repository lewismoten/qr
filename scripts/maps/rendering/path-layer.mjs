import { clipPolygon, clipPolyline } from '../geometry-clip.mjs';

function simplifyPoints(points, tolerance) {
  const output = [];
  let previous = null;
  for (const point of points) {
    if (
      previous &&
      Math.hypot(point[0] - previous[0], point[1] - previous[1]) < tolerance
    ) {
      continue;
    }
    output.push(point);
    previous = point;
  }
  return output;
}

function pathForPoints(points, close, tolerance) {
  const values = simplifyPoints(points, tolerance).map((point) => {
    const x = tolerance >= 1 ? Math.round(point[0]) : point[0].toFixed(1);
    const y = tolerance >= 1 ? Math.round(point[1]) : point[1].toFixed(1);
    return `${x} ${y}`;
  });
  if (values.length < 2) return '';
  return `M${values.join(' ')}${close ? 'Z' : ''}`;
}

function projectedPaths(
  coordinates,
  tile,
  close,
  tolerance,
  project,
  tileSize,
) {
  const originX = tile.x * tileSize;
  const originY = tile.y * tileSize;
  const points = coordinates.map((coordinate) => {
    const [worldX, worldY] = project(coordinate, tile.zoom);
    return [worldX - originX, worldY - originY];
  });
  const groups = close ? [clipPolygon(points)] : clipPolyline(points);
  return groups.map((group) => pathForPoints(group, close, tolerance));
}

function coordinateBounds(coordinates) {
  return coordinates.reduce(
    (bounds, [x, y]) => [
      Math.min(bounds[0], x),
      Math.min(bounds[1], y),
      Math.max(bounds[2], x),
      Math.max(bounds[3], y),
    ],
    [Infinity, Infinity, -Infinity, -Infinity],
  );
}

function tileIntersectsBounds(tile, bounds, project, tileSize) {
  const count = 2 ** tile.zoom;
  const left = (bounds[0] / 360 + 0.5) * count;
  const right = (bounds[2] / 360 + 0.5) * count;
  const north = project([0, bounds[3]], tile.zoom)[1] / tileSize;
  const south = project([0, bounds[1]], tile.zoom)[1] / tileSize;
  return (
    right >= tile.x &&
    left <= tile.x + 1 &&
    south >= tile.y &&
    north <= tile.y + 1
  );
}

function visiblePath(coordinates, tile, close, tolerance, project, tileSize) {
  const bounds = coordinateBounds(coordinates);
  return tileIntersectsBounds(tile, bounds, project, tileSize)
    ? projectedPaths(coordinates, tile, close, tolerance, project, tileSize)
    : [];
}

function pathsForGeometry(geometry, tile, tolerance, project, tileSize) {
  if (!geometry) return [];
  if (geometry.type === 'LineString') {
    return visiblePath(
      geometry.coordinates,
      tile,
      false,
      tolerance,
      project,
      tileSize,
    );
  }
  if (geometry.type === 'MultiLineString') {
    return geometry.coordinates.flatMap((line) =>
      visiblePath(line, tile, false, tolerance, project, tileSize),
    );
  }
  const polygons =
    geometry.type === 'Polygon'
      ? [geometry.coordinates]
      : geometry.type === 'MultiPolygon'
        ? geometry.coordinates
        : [];
  return polygons.flatMap((polygon) =>
    polygon.flatMap((ring) =>
      visiblePath(ring, tile, true, tolerance, project, tileSize),
    ),
  );
}

export function featureBounds(feature) {
  if (feature.bbox?.length >= 4) return feature.bbox;
  if (!feature.geometry) return [0, 0, 0, 0];
  const points = [];
  const collect = (value) => {
    if (typeof value[0] === 'number') points.push(value);
    else value.forEach(collect);
  };
  collect(feature.geometry.coordinates);
  return coordinateBounds(points);
}

export function renderPaths(
  features,
  tile,
  className,
  tolerance,
  project,
  tileSize,
) {
  const path = features
    .filter((feature) =>
      tileIntersectsBounds(tile, feature._bounds, project, tileSize),
    )
    .flatMap((feature) =>
      pathsForGeometry(feature.geometry, tile, tolerance, project, tileSize),
    )
    .filter(Boolean)
    .join('');
  return path ? `<path class="${className}" d="${path}"/>` : '';
}
