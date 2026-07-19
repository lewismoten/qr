const TILE_SIZE = 256;
const MAX_LATITUDE = 85.05112878;

const clamp = (value, minimum, maximum) =>
  Math.min(maximum, Math.max(minimum, value));

function project([longitude, latitude], zoom) {
  const scale = TILE_SIZE * 2 ** zoom;
  const radians =
    (clamp(latitude, -MAX_LATITUDE, MAX_LATITUDE) * Math.PI) / 180;
  return [
    ((longitude + 180) / 360) * scale,
    ((1 - Math.asinh(Math.tan(radians)) / Math.PI) / 2) * scale,
  ];
}

function projectedPath(coordinates, tile, close = false) {
  const originX = tile.x * TILE_SIZE;
  const originY = tile.y * TILE_SIZE;
  let previous = null;
  const values = [];
  for (const coordinate of coordinates) {
    const [worldX, worldY] = project(coordinate, tile.zoom);
    const point = [worldX - originX, worldY - originY];
    if (
      previous &&
      Math.hypot(point[0] - previous[0], point[1] - previous[1]) < 0.45
    ) {
      continue;
    }
    values.push(`${point[0].toFixed(1)} ${point[1].toFixed(1)}`);
    previous = point;
  }
  if (values.length < 2) return '';
  return `M${values.join('L')}${close ? 'Z' : ''}`;
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

function visiblePath(coordinates, tile, close = false) {
  return tileIntersectsBounds(tile, coordinateBounds(coordinates))
    ? projectedPath(coordinates, tile, close)
    : '';
}

function pathsForGeometry(geometry, tile) {
  if (!geometry) return [];
  if (geometry.type === 'LineString') {
    return [visiblePath(geometry.coordinates, tile)];
  }
  if (geometry.type === 'MultiLineString') {
    return geometry.coordinates.map((line) => visiblePath(line, tile));
  }
  const polygons =
    geometry.type === 'Polygon'
      ? [geometry.coordinates]
      : geometry.type === 'MultiPolygon'
        ? geometry.coordinates
        : [];
  return polygons.flatMap((polygon) =>
    polygon.map((ring) => visiblePath(ring, tile, true)),
  );
}

function tileIntersectsBounds(tile, bounds) {
  const count = 2 ** tile.zoom;
  const left = (bounds[0] / 360 + 0.5) * count;
  const right = (bounds[2] / 360 + 0.5) * count;
  const north = project([0, bounds[3]], tile.zoom)[1] / TILE_SIZE;
  const south = project([0, bounds[1]], tile.zoom)[1] / TILE_SIZE;
  return (
    right >= tile.x &&
    left <= tile.x + 1 &&
    south >= tile.y &&
    north <= tile.y + 1
  );
}

function featureBounds(feature) {
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

function renderPaths(features, tile, className) {
  const path = features
    .filter((feature) => tileIntersectsBounds(tile, feature._bounds))
    .flatMap((feature) => pathsForGeometry(feature.geometry, tile))
    .filter(Boolean)
    .join('');
  return path ? `<path class="${className}" d="${path}"/>` : '';
}

function renderCities(features, tile) {
  return features
    .filter((feature) => {
      const properties = feature.properties ?? {};
      const minimumZoom = Number(
        properties.min_zoom ?? properties.MIN_ZOOM ?? 0,
      );
      return minimumZoom <= tile.zoom;
    })
    .map((feature) => {
      const [x, y] = project(feature.geometry.coordinates, tile.zoom);
      const localX = x - tile.x * TILE_SIZE;
      const localY = y - tile.y * TILE_SIZE;
      if (localX < 0 || localX > 256 || localY < 0 || localY > 256) return '';
      return (
        `<circle class="city" cx="${localX.toFixed(1)}" ` +
        `cy="${localY.toFixed(1)}" r="2"/>`
      );
    })
    .join('');
}

export function prepareCollections(collections) {
  return Object.fromEntries(
    Object.entries(collections).map(([name, value]) => [
      name,
      {
        minimumZoom: value.minimumZoom,
        maximumZoom: value.maximumZoom,
        features: value.collection.features.map((feature) => ({
          ...feature,
          _bounds: featureBounds(feature),
        })),
      },
    ]),
  );
}

function activeFeatures(collections, name, zoom) {
  const layer = collections[name];
  if (!layer || zoom < layer.minimumZoom || zoom > layer.maximumZoom) return [];
  return layer.features;
}

export function renderTile(tile, collections) {
  const countries = renderPaths(
    activeFeatures(collections, 'countries', tile.zoom),
    tile,
    'country',
  );
  const regions = renderPaths(
    activeFeatures(collections, 'regions', tile.zoom),
    tile,
    'region',
  );
  const cities = renderCities(
    activeFeatures(collections, 'cities', tile.zoom),
    tile,
  );
  if (!countries && !regions && !cities) return '';
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">' +
    '<style>.country{fill:#d9e9c3;stroke:#5d8069;stroke-width:1}' +
    '.region{fill:none;stroke:#8a9d75;stroke-width:.7}' +
    '.city{fill:#e11d48;stroke:#fff;stroke-width:.7}</style>' +
    countries +
    regions +
    cities +
    '</svg>\n'
  );
}
