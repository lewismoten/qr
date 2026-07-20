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
  'protectedAreas',
  'protectedLines',
  'protectedPoints',
  'regions',
  'primaryRoadsOverview',
  'primaryRoads',
  'secondaryRoads',
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
const TRANSPORTATION_ROOT =
  'https://tigerweb.geo.census.gov/arcgis/rest/services/' +
  'TIGERweb/Transportation/MapServer/';
const ROAD_QUERY =
  'where=1%3D1&outFields=%2A&' +
  'returnGeometry=true&outSR=4326&geometryPrecision=4&f=geojson';
const transportationUrl = (layer, offset) =>
  `${TRANSPORTATION_ROOT}${layer}/query?${ROAD_QUERY}&` +
  `maxAllowableOffset=${offset}`;
const NHDPLUS_ROOT =
  'https://hydro.nationalmap.gov/arcgis/rest/services/' +
  'NHDPlus_HR/MapServer/3/query?';
const NHDPLUS_WHERE = 'visibilityfilter%3E%3D5000000';
const NHDPLUS_QUERY =
  `where=${NHDPLUS_WHERE}&` +
  'outFields=OBJECTID%2Cgnis_name%2Cstreamorde%2Cvisibilityfilter%2Cftype&' +
  'returnGeometry=true&returnZ=false&returnM=false&outSR=4326&' +
  'geometryPrecision=5&maxAllowableOffset=0.00025&f=geojson';
const LOCAL_DETAIL_MAXIMUM_ZOOM = 13;

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
  nhdMajorRivers: {
    file: 'usgs/nhdplus_hr_major_rivers.geojson',
    url: `${NHDPLUS_ROOT}${NHDPLUS_QUERY}`,
    idsUrl:
      `${NHDPLUS_ROOT}where=${NHDPLUS_WHERE}&` + 'returnIdsOnly=true&f=json',
    objectIdPagination: true,
    parallelPages: 4,
    pageSize: 2000,
    minimumZoom: 9,
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
  primaryRoadsOverview: {
    file: 'census/census_2025_primary_roads_5m.geojson',
    url: transportationUrl(0, 0.008),
    pageSize: 1000,
    minimumZoom: 6,
    maximumZoom: 7,
    kind: 'line',
  },
  primaryRoads: {
    file: 'census/census_2025_primary_roads_2m.geojson',
    url: transportationUrl(1, 0.002),
    pageSize: 1000,
    minimumZoom: 8,
    maximumZoom: LOCAL_DETAIL_MAXIMUM_ZOOM,
    kind: 'line',
  },
  secondaryRoads: {
    file: 'census/census_2025_secondary_roads_2m.geojson',
    url: transportationUrl(3, 0.001),
    pageSize: 1000,
    minimumZoom: 8,
    maximumZoom: LOCAL_DETAIL_MAXIMUM_ZOOM,
    kind: 'line',
  },
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

export const SOURCE_ATTRIBUTION = [
  {
    name: 'Natural Earth',
    license: 'Public domain',
    website: 'https://www.naturalearthdata.com/',
    version: '5.1.2',
  },
  {
    name: 'U.S. Census Bureau',
    license: 'U.S. government work',
    website: 'https://www.census.gov/geographies/mapping-files.html',
    version: '2024 ACS boundaries and 2025 TIGERweb primary roads',
  },
  {
    name: 'U.S. Geological Survey',
    license: 'Public domain',
    website: 'https://www.usgs.gov/national-hydrography/',
    version: 'NHDPlus High Resolution',
  },
  {
    name: 'GeoNames',
    license: 'Creative Commons Attribution 4.0',
    website: 'https://www.geonames.org/',
    version: 'cities1000 gazetteer extract',
  },
];
