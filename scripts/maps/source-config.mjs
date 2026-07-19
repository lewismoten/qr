export const DEFAULT_LAYERS = ['countries', 'regions', 'cities'];

const NATURAL_EARTH_ROOT =
  'https://raw.githubusercontent.com/nvkelso/' +
  'natural-earth-vector/v5.1.2/geojson/';

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
  cities: {
    file: 'ne_50m_populated_places_simple.geojson',
    url: `${NATURAL_EARTH_ROOT}ne_50m_populated_places_simple.geojson`,
    minimumZoom: 4,
    maximumZoom: 19,
    kind: 'point',
  },
};

export const SOURCE_ATTRIBUTION = {
  name: 'Natural Earth',
  license: 'Public domain',
  website: 'https://www.naturalearthdata.com/',
  version: '5.1.2',
};
