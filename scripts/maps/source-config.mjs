export const DEFAULT_LAYERS = [
  'countries',
  'regions',
  'states',
  'subdivisions',
  'cities',
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

export const MAP_SOURCES = {
  countries: {
    file: 'ne_50m_admin_0_countries.geojson',
    url: `${NATURAL_EARTH_ROOT}ne_50m_admin_0_countries.geojson`,
    minimumZoom: 1,
    maximumZoom: 19,
    kind: 'area',
  },
  regions: {
    file: 'ne_50m_admin_1_states_provinces_lines.geojson',
    url:
      `${NATURAL_EARTH_ROOT}` + 'ne_50m_admin_1_states_provinces_lines.geojson',
    minimumZoom: 4,
    maximumZoom: 19,
    kind: 'line',
  },
  states: {
    file: 'census_2024_states_20m.geojson',
    url: censusUrl(9),
    minimumZoom: 7,
    maximumZoom: 19,
    kind: 'area',
  },
  subdivisions: {
    file: 'census_2024_counties_20m.geojson',
    url: censusUrl(13),
    minimumZoom: 7,
    maximumZoom: 19,
    kind: 'area',
  },
  cities: {
    file: 'ne_50m_populated_places_simple.geojson',
    url: `${NATURAL_EARTH_ROOT}ne_50m_populated_places_simple.geojson`,
    minimumZoom: 4,
    maximumZoom: 19,
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
    version: '2024 ACS generalized states and counties 20M',
  },
];
