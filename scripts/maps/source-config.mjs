import { SOURCE_ATTRIBUTION } from './sources/attribution.mjs';
import { createDetailSources } from './sources/detail.mjs';

export const DEFAULT_LAYERS = [
  'countries',
  'lakesOverview',
  'lakes',
  'riversOverview',
  'rivers',
  'riversNorthAmerica',
  'riversEurope',
  'riversAustralia',
  'nhdMajorRivers',
  'nhdLocalRivers',
  'protectedAreas',
  'protectedLines',
  'protectedPoints',
  'regions',
  'primaryRoadsOverview',
  'primaryRoads',
  'secondaryRoads',
  'secondaryRoadsDetailed',
  'secondaryRoadsLocal',
  'localRoads',
  'railroadsOverview',
  'railroadsDetailed',
  'railroadsLocal',
  'naturalEarthRoads',
  'states',
  'subdivisions',
  'cities',
  'settlements',
  'towns',
];

const NATURAL_EARTH_ROOT =
  'https://raw.githubusercontent.com/nvkelso/' +
  'natural-earth-vector/v5.1.2/geojson/';
const CENSUS_SERVICE_ROOT =
  'https://tigerweb.geo.census.gov/arcgis/rest/services/' +
  'Generalized_ACS2024/State_County/MapServer/';
const CENSUS_QUERY =
  'where=1%3D1&outFields=GEOID%2CNAME&returnGeometry=true&' +
  'outSR=4326&f=geojson';

const censusUrl = (layer) =>
  `${CENSUS_SERVICE_ROOT}${layer}/query?${CENSUS_QUERY}`;
const LOCAL_DETAIL_MAXIMUM_ZOOM = 16;

export const MAP_SOURCES = {
  countries: {
    file: 'cultural/ne_50m_admin_0_countries.geojson',
    url: `${NATURAL_EARTH_ROOT}ne_50m_admin_0_countries.geojson`,
    minimumZoom: 1,
    maximumZoom: 19,
    kind: 'area',
  },
  lakesOverview: {
    file: 'physical/ne_50m_lakes.geojson',
    url: `${NATURAL_EARTH_ROOT}ne_50m_lakes.geojson`,
    minimumZoom: 1,
    maximumZoom: 5,
    kind: 'area',
  },
  lakes: {
    file: 'physical/ne_10m_lakes.geojson',
    url: `${NATURAL_EARTH_ROOT}ne_10m_lakes.geojson`,
    minimumZoom: 6,
    maximumZoom: LOCAL_DETAIL_MAXIMUM_ZOOM,
    kind: 'area',
  },
  riversOverview: {
    file: 'physical/ne_50m_rivers_lake_centerlines_scale_rank.geojson',
    url:
      `${NATURAL_EARTH_ROOT}` +
      'ne_50m_rivers_lake_centerlines_scale_rank.geojson',
    minimumZoom: 1,
    maximumZoom: 5,
    kind: 'line',
  },
  rivers: {
    file: 'physical/ne_10m_rivers_lake_centerlines_scale_rank.geojson',
    url:
      `${NATURAL_EARTH_ROOT}` +
      'ne_10m_rivers_lake_centerlines_scale_rank.geojson',
    minimumZoom: 6,
    maximumZoom: LOCAL_DETAIL_MAXIMUM_ZOOM,
    kind: 'line',
  },
  riversNorthAmerica: {
    file: 'physical/ne_10m_rivers_north_america.geojson',
    url: `${NATURAL_EARTH_ROOT}ne_10m_rivers_north_america.geojson`,
    minimumZoom: 8,
    maximumZoom: LOCAL_DETAIL_MAXIMUM_ZOOM,
    kind: 'line',
  },
  riversEurope: {
    file: 'physical/ne_10m_rivers_europe.geojson',
    url: `${NATURAL_EARTH_ROOT}ne_10m_rivers_europe.geojson`,
    minimumZoom: 8,
    maximumZoom: LOCAL_DETAIL_MAXIMUM_ZOOM,
    kind: 'line',
  },
  riversAustralia: {
    file: 'physical/ne_10m_rivers_australia.geojson',
    url: `${NATURAL_EARTH_ROOT}ne_10m_rivers_australia.geojson`,
    minimumZoom: 8,
    maximumZoom: LOCAL_DETAIL_MAXIMUM_ZOOM,
    kind: 'line',
  },
  protectedAreas: {
    file: 'cultural/ne_10m_parks_and_protected_lands_area.geojson',
    url:
      `${NATURAL_EARTH_ROOT}` + 'ne_10m_parks_and_protected_lands_area.geojson',
    minimumZoom: 6,
    maximumZoom: LOCAL_DETAIL_MAXIMUM_ZOOM,
    kind: 'area',
  },
  protectedLines: {
    file: 'cultural/ne_10m_parks_and_protected_lands_line.geojson',
    url:
      `${NATURAL_EARTH_ROOT}` + 'ne_10m_parks_and_protected_lands_line.geojson',
    minimumZoom: 7,
    maximumZoom: LOCAL_DETAIL_MAXIMUM_ZOOM,
    kind: 'line',
  },
  protectedPoints: {
    file: 'cultural/ne_10m_parks_and_protected_lands_point.geojson',
    url:
      `${NATURAL_EARTH_ROOT}` +
      'ne_10m_parks_and_protected_lands_point.geojson',
    minimumZoom: 8,
    maximumZoom: LOCAL_DETAIL_MAXIMUM_ZOOM,
    kind: 'point',
  },
  regions: {
    file: 'cultural/ne_50m_admin_1_states_provinces_lines.geojson',
    url:
      `${NATURAL_EARTH_ROOT}` + 'ne_50m_admin_1_states_provinces_lines.geojson',
    minimumZoom: 4,
    maximumZoom: 19,
    kind: 'line',
  },
  ...createDetailSources(LOCAL_DETAIL_MAXIMUM_ZOOM),
  naturalEarthRoads: {
    file: 'cultural/ne_10m_roads.geojson',
    url: `${NATURAL_EARTH_ROOT}ne_10m_roads.geojson`,
    minimumZoom: 6,
    maximumZoom: LOCAL_DETAIL_MAXIMUM_ZOOM,
    kind: 'line',
    featureFilter: {
      property: 'sov_a3',
      exclude: ['USA'],
    },
  },
  states: {
    file: 'census/census_2024_states_20m.geojson',
    url: censusUrl(9),
    minimumZoom: 7,
    maximumZoom: 19,
    kind: 'area',
  },
  subdivisions: {
    file: 'census/census_2024_counties_20m.geojson',
    url: censusUrl(13),
    minimumZoom: 7,
    maximumZoom: 19,
    kind: 'area',
  },
  cities: {
    file: 'cultural/ne_50m_populated_places_simple.geojson',
    url: `${NATURAL_EARTH_ROOT}ne_50m_populated_places_simple.geojson`,
    minimumZoom: 4,
    maximumZoom: 6,
    kind: 'point',
  },
  settlements: {
    file: 'cultural/ne_10m_populated_places_simple.geojson',
    url: `${NATURAL_EARTH_ROOT}ne_10m_populated_places_simple.geojson`,
    minimumZoom: 7,
    maximumZoom: LOCAL_DETAIL_MAXIMUM_ZOOM,
    kind: 'point',
  },
  towns: {
    file: 'cultural/geonames_cities1000.geojson',
    url: 'https://download.geonames.org/export/dump/cities1000.zip',
    format: 'geonames',
    cacheVersion: 2,
    minimumZoom: 7,
    maximumZoom: LOCAL_DETAIL_MAXIMUM_ZOOM,
    kind: 'point',
  },
};

export { SOURCE_ATTRIBUTION };
