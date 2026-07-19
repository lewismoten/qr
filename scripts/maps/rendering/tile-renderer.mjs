import { clipPolygon, clipPolyline } from '../geometry-clip.mjs';
import { pointFeatures, renderCities } from './city-layer.mjs';
import { createFeatureSelector } from './feature-index.mjs';
import {
  isNaturalEarthMinorRoad,
  isUnitedStatesRegion,
  MAP_TILE_STYLE,
  SIMPLIFICATION_STEPS,
} from './tile-layer-support.mjs';

const [TILE_SIZE, MAX_LATITUDE] = [256, 85.05112878];

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

const { featuresInTile, rankedTileFeatures } = createFeatureSelector(
  project,
  TILE_SIZE,
);

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

export function prepareCollections(collections) {
  return Object.fromEntries(
    Object.entries(collections).map(([name, value]) => [
      name,
      {
        minimumZoom: value.minimumZoom,
        maximumZoom: value.maximumZoom,
        pointIndexes: new Map(),
        tileIndexes: new Map(),
        features: value.collection.features
          .filter((feature) => {
            const filter = value.featureFilter;
            if (!filter) return true;
            const propertyValue = feature.properties?.[filter.property];
            return !filter.exclude.includes(propertyValue);
          })
          .map((feature) => ({
            ...feature,
            _bounds: featureBounds(feature),
          })),
      },
    ]),
  );
}

export function renderTile(tile, collections, tolerance = 0.45) {
  const countries = renderPaths(
    featuresInTile(collections, 'countries', tile),
    tile,
    'country',
    tolerance,
  );
  const lakes = renderPaths(
    [
      ...rankedTileFeatures(collections, 'lakesOverview', tile),
      ...rankedTileFeatures(collections, 'lakes', tile),
    ],
    tile,
    'lake',
    tolerance,
  );
  const rivers = renderPaths(
    [
      ...rankedTileFeatures(collections, 'riversOverview', tile),
      ...rankedTileFeatures(collections, 'rivers', tile),
    ],
    tile,
    'river',
    tolerance,
  );
  const riverDetails = renderPaths(
    [
      ...rankedTileFeatures(collections, 'riversNorthAmerica', tile),
      ...rankedTileFeatures(collections, 'riversEurope', tile),
      ...rankedTileFeatures(collections, 'riversAustralia', tile),
    ],
    tile,
    'river-detail',
    tolerance,
  );
  const stateFeatures = featuresInTile(collections, 'states', tile);
  const regionFeatures = featuresInTile(collections, 'regions', tile).filter(
    (feature) => !stateFeatures.length || !isUnitedStatesRegion(feature),
  );
  const regions = renderPaths(regionFeatures, tile, 'region', tolerance);
  const naturalEarthRoads = rankedTileFeatures(
    collections,
    'naturalEarthRoads',
    tile,
  );
  const roads = renderPaths(
    [
      ...featuresInTile(collections, 'primaryRoadsOverview', tile),
      ...featuresInTile(collections, 'primaryRoads', tile),
      ...naturalEarthRoads.filter(
        (feature) => !isNaturalEarthMinorRoad(feature, tile.zoom),
      ),
    ],
    tile,
    'primary-road',
    tolerance,
  );
  const secondaryRoads = renderPaths(
    [
      ...featuresInTile(collections, 'secondaryRoads', tile),
      ...naturalEarthRoads.filter((feature) =>
        isNaturalEarthMinorRoad(feature, tile.zoom),
      ),
    ],
    tile,
    'secondary-road',
    tolerance,
  );
  const subdivisions = renderPaths(
    featuresInTile(collections, 'subdivisions', tile),
    tile,
    'subdivision',
    tolerance,
  );
  const states = renderPaths(stateFeatures, tile, 'state-boundary', tolerance);
  const cities = renderCities(
    [
      ...pointFeatures(collections, 'cities', tile, project, TILE_SIZE),
      ...pointFeatures(collections, 'settlements', tile, project, TILE_SIZE),
    ],
    tile,
    project,
    TILE_SIZE,
  );
  const content = [countries, lakes, rivers, riverDetails, roads];
  content.push(secondaryRoads);
  content.push(regions, subdivisions, states, cities);
  if (!content.some(Boolean)) return '';
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">' +
    MAP_TILE_STYLE +
    countries +
    lakes +
    rivers +
    riverDetails +
    roads +
    secondaryRoads +
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
