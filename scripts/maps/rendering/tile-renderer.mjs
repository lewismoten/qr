import { pointFeatures, renderCities } from './city-layer.mjs';
import { createFeatureSelector } from './feature-index.mjs';
import {
  featureBounds,
  renderPaths as renderGeometryPaths,
} from './path-layer.mjs';
import { renderProtectedPoints } from './protected-layer.mjs';
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

function renderPaths(features, tile, className, tolerance) {
  return renderGeometryPaths(
    features,
    tile,
    className,
    tolerance,
    project,
    TILE_SIZE,
  );
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
  const protectedAreas = renderPaths(
    featuresInTile(collections, 'protectedAreas', tile),
    tile,
    'protected-area',
    tolerance,
  );
  const protectedLines = renderPaths(
    featuresInTile(collections, 'protectedLines', tile),
    tile,
    'protected-line',
    tolerance,
  );
  const protectedPoints = renderProtectedPoints(
    collections,
    tile,
    project,
    TILE_SIZE,
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
      ...rankedTileFeatures(collections, 'nhdMajorRivers', tile),
      ...rankedTileFeatures(collections, 'nhdLocalRivers', tile),
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
      ...featuresInTile(collections, 'secondaryRoadsDetailed', tile),
      ...featuresInTile(collections, 'secondaryRoadsLocal', tile),
      ...naturalEarthRoads.filter((feature) =>
        isNaturalEarthMinorRoad(feature, tile.zoom),
      ),
    ],
    tile,
    'secondary-road',
    tolerance,
  );
  const railways = renderPaths(
    [
      ...featuresInTile(collections, 'railroadsOverview', tile),
      ...featuresInTile(collections, 'railroadsDetailed', tile),
      ...featuresInTile(collections, 'railroadsLocal', tile),
    ],
    tile,
    'railway',
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
      ...pointFeatures(collections, 'towns', tile, project, TILE_SIZE),
    ],
    tile,
    project,
    TILE_SIZE,
  );
  const content = [countries, protectedAreas, protectedLines];
  content.push(protectedPoints, lakes, rivers, riverDetails, roads);
  content.push(secondaryRoads);
  content.push(railways);
  content.push(regions, subdivisions, states, cities);
  if (!content.some(Boolean)) return '';
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">' +
    MAP_TILE_STYLE +
    countries +
    protectedAreas +
    protectedLines +
    protectedPoints +
    lakes +
    rivers +
    riverDetails +
    roads +
    secondaryRoads +
    railways +
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
