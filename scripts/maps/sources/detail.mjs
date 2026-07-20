const TRANSPORTATION_ROOT =
  'https://tigerweb.geo.census.gov/arcgis/rest/services/' +
  'TIGERweb/Transportation/MapServer/';
const roadQuery = (precision) =>
  'where=1%3D1&outFields=OBJECTID%2CRTTYP%2CMTFCC&' +
  `returnGeometry=true&outSR=4326&geometryPrecision=${precision}&f=geojson`;
const transportationUrl = (layer, offset, precision = 4) =>
  `${TRANSPORTATION_ROOT}${layer}/query?${roadQuery(precision)}&` +
  `maxAllowableOffset=${offset}`;

const RAILROAD_ROOT =
  'https://tigerweb.geo.census.gov/arcgis/rest/services/' +
  'TIGERweb/Transportation_LargeScale/MapServer/3/query?';
const railroadQuery = (precision) =>
  'where=1%3D1&outFields=OBJECTID%2CMTFCC&returnGeometry=true&' +
  `outSR=4326&geometryPrecision=${precision}&f=geojson`;
const railroadUrl = (offset, precision = 4) =>
  `${RAILROAD_ROOT}${railroadQuery(precision)}&` +
  `maxAllowableOffset=${offset}`;

const NHDPLUS_ROOT =
  'https://hydro.nationalmap.gov/arcgis/rest/services/' +
  'NHDPlus_HR/MapServer/3/query?';
const nhdWhere = (visibility) => `visibilityfilter%3E%3D${visibility}`;
const nhdUrl = (visibility, offset) =>
  `${NHDPLUS_ROOT}where=${nhdWhere(visibility)}&` +
  'outFields=OBJECTID%2Cvisibilityfilter%2Cftype&' +
  'returnGeometry=true&returnZ=false&returnM=false&outSR=4326&' +
  `geometryPrecision=5&maxAllowableOffset=${offset}&f=geojson`;
const nhdIdsUrl = (visibility) =>
  `${NHDPLUS_ROOT}where=${nhdWhere(visibility)}&` + 'returnIdsOnly=true&f=json';
const pagedNhdSource = (visibility, offset) => ({
  url: nhdUrl(visibility, offset),
  idsUrl: nhdIdsUrl(visibility),
  objectIdPagination: true,
  parallelPages: 4,
  pageSize: 2000,
  kind: 'line',
});

export function createDetailSources(maximumZoom) {
  return {
    nhdMajorRivers: {
      file: 'usgs/nhdplus_hr_major_rivers.geojson',
      ...pagedNhdSource(5000000, 0.00025),
      minimumZoom: 9,
      maximumZoom: 13,
    },
    nhdLocalRivers: {
      file: 'usgs/nhdplus_hr_local_rivers.geojson',
      ...pagedNhdSource(1000000, 0.0001),
      minimumZoom: 14,
      maximumZoom,
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
      maximumZoom,
      kind: 'line',
    },
    secondaryRoads: {
      file: 'census/census_2025_secondary_roads_2m.geojson',
      url: transportationUrl(3, 0.001),
      pageSize: 1000,
      minimumZoom: 8,
      maximumZoom: 11,
      kind: 'line',
    },
    secondaryRoadsDetailed: {
      file: 'census/census_2025_secondary_roads_144k.geojson',
      url: transportationUrl(5, 0.0005),
      pageSize: 1000,
      minimumZoom: 12,
      maximumZoom: 13,
      kind: 'line',
    },
    secondaryRoadsLocal: {
      file: 'census/census_2025_secondary_roads_72k.geojson',
      url: transportationUrl(6, 0.00015, 5),
      pageSize: 1000,
      minimumZoom: 14,
      maximumZoom,
      kind: 'line',
    },
    railroadsOverview: {
      file: 'census/census_2025_railroads_2m.geojson',
      url: railroadUrl(0.002),
      pageSize: 1000,
      minimumZoom: 10,
      maximumZoom: 11,
      kind: 'line',
    },
    railroadsDetailed: {
      file: 'census/census_2025_railroads_500k.geojson',
      url: railroadUrl(0.0005),
      pageSize: 1000,
      minimumZoom: 12,
      maximumZoom: 13,
      kind: 'line',
    },
    railroadsLocal: {
      file: 'census/census_2025_railroads_100k.geojson',
      url: railroadUrl(0.0001, 5),
      pageSize: 1000,
      minimumZoom: 14,
      maximumZoom,
      kind: 'line',
    },
  };
}
