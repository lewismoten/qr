import { clipPolygon, clipPolyline } from './geometry-clip.mjs';

const TILE_SIZE = 256;
const MAX_LATITUDE = 85.05112878;
const SIMPLIFICATION_STEPS = [
  0.45, 0.75, 1, 1.5, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48,
];

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

function projectedPaths(coordinates, tile, close, tolerance) {
  const originX = tile.x * TILE_SIZE;
  const originY = tile.y * TILE_SIZE;
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

function visiblePath(coordinates, tile, close, tolerance) {
  return tileIntersectsBounds(tile, coordinateBounds(coordinates))
    ? projectedPaths(coordinates, tile, close, tolerance)
    : [];
}

function pathsForGeometry(geometry, tile, tolerance) {
  if (!geometry) return [];
  if (geometry.type === 'LineString') {
    return visiblePath(geometry.coordinates, tile, false, tolerance);
  }
  if (geometry.type === 'MultiLineString') {
    return geometry.coordinates.flatMap((line) =>
      visiblePath(line, tile, false, tolerance),
    );
  }
  const polygons =
    geometry.type === 'Polygon'
      ? [geometry.coordinates]
      : geometry.type === 'MultiPolygon'
        ? geometry.coordinates
        : [];
  return polygons.flatMap((polygon) =>
    polygon.flatMap((ring) => visiblePath(ring, tile, true, tolerance)),
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

function renderPaths(features, tile, className, tolerance) {
  const path = features
    .filter((feature) => tileIntersectsBounds(tile, feature._bounds))
    .flatMap((feature) => pathsForGeometry(feature.geometry, tile, tolerance))
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

function isUnitedStatesRegion(feature) {
  const properties = feature.properties ?? {};
  return (
    properties.ADM0_A3 === 'USA' ||
    properties.adm0_a3 === 'USA' ||
    properties.ADM0_NAME === 'United States of America'
  );
}

export function renderTile(tile, collections, tolerance = 0.45) {
  const countries = renderPaths(
    activeFeatures(collections, 'countries', tile.zoom),
    tile,
    'country',
    tolerance,
  );
  const stateFeatures = activeFeatures(collections, 'states', tile.zoom);
  const regionFeatures = activeFeatures(
    collections,
    'regions',
    tile.zoom,
  ).filter(
    (feature) => !stateFeatures.length || !isUnitedStatesRegion(feature),
  );
  const regions = renderPaths(regionFeatures, tile, 'region', tolerance);
  const roads = renderPaths(
    [
      ...activeFeatures(collections, 'primaryRoadsOverview', tile.zoom),
      ...activeFeatures(collections, 'primaryRoads', tile.zoom),
    ],
    tile,
    'primary-road',
    tolerance,
  );
  const subdivisions = renderPaths(
    activeFeatures(collections, 'subdivisions', tile.zoom),
    tile,
    'subdivision',
    tolerance,
  );
  const states = renderPaths(stateFeatures, tile, 'state-boundary', tolerance);
  const cities = renderCities(
    activeFeatures(collections, 'cities', tile.zoom),
    tile,
  );
  if (!countries && !regions && !roads && !subdivisions && !states && !cities) {
    return '';
  }
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">' +
    '<style>.country{fill:#d9e9c3;stroke:#5d8069;stroke-width:1}' +
    '.primary-road{fill:none;stroke:#c56f43;stroke-width:.8;' +
    'stroke-linecap:round;stroke-linejoin:round}' +
    '.region{fill:none;stroke:#8a9d75;stroke-width:.7}' +
    '.subdivision{fill:none;stroke:#aab59a;stroke-width:.45}' +
    '.state-boundary{fill:none;stroke:#7d916f;stroke-width:.8}' +
    '.city{fill:#e11d48;stroke:#fff;stroke-width:.7}</style>' +
    countries +
    roads +
    regions +
    subdivisions +
    states +
    cities +
    '</svg>\n'
  );
}

export function renderTileWithinSize(tile, collections, maximumBytes) {
  let tolerance = SIMPLIFICATION_STEPS[0];
  let svg = renderTile(tile, collections, tolerance);
  const original = svg;
  for (const next of SIMPLIFICATION_STEPS.slice(1)) {
    if (!svg || svg.length <= maximumBytes) break;
    tolerance = next;
    svg = renderTile(tile, collections, tolerance);
  }
  return {
    svg,
    tolerance,
    originalBytes: original.length,
  };
}
