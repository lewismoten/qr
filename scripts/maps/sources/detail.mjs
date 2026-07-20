const TRANSPORTATION_ROOT =
  'https://tigerweb.geo.census.gov/arcgis/rest/services/' +
  'TIGERweb/Transportation/MapServer/';
const roadQuery = (precision, where = '1%3D1') =>
  `where=${where}&outFields=OBJECTID%2CRTTYP%2CMTFCC&` +
  `returnGeometry=true&outSR=4326&geometryPrecision=${precision}&f=geojson`;
const transportationUrl = (layer, offset, precision = 4, where) =>
  `${TRANSPORTATION_ROOT}${layer}/query?${roadQuery(precision, where)}&` +
  `maxAllowableOffset=${offset}`;
const transportationIdsUrl = (layer, where) =>
  `${TRANSPORTATION_ROOT}${layer}/query?where=${where}&` +
  'returnIdsOnly=true&f=json';
const LOCAL_ROAD_WHERE =
  'RTTYP%3D%27C%27%20OR%20RTTYP%3D%27O%27%20OR%20' +
  '%28RTTYP%3D%27M%27%20AND%20STGEOMETRY_Length%3E%3D10000%29';
const MAIN_ROAD_WHERE = 'BASENAME%3D%27Main%27';
const DETAIL_ROAD_WHERE =
  'RTTYP%3D%27M%27%20AND%20STGEOMETRY_Length%3E%3D8500%20AND%20' +
  'STGEOMETRY_Length%3C10000';

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
const NHD_MAJOR_WHERE = 'visibilityfilter%3E%3D5000000';
const NHD_LOCAL_WHERE =
  'visibilityfilter%3E%3D1000000%20AND%20' +
  'visibilityfilter%3C5000000%20AND%20streamorde%3E%3D6';
const nhdUrl = (where, offset) =>
  `${NHDPLUS_ROOT}where=${where}&` +
  'outFields=OBJECTID%2Cvisibilityfilter%2Cftype&' +
  'returnGeometry=true&returnZ=false&returnM=false&outSR=4326&' +
  `geometryPrecision=5&maxAllowableOffset=${offset}&f=geojson`;
const nhdIdsUrl = (where) =>
  `${NHDPLUS_ROOT}where=${where}&returnIdsOnly=true&f=json`;
const pagedNhdSource = (where, offset, maximumFeatures) => ({
  url: nhdUrl(where, offset),
  idsUrl: nhdIdsUrl(where),
  objectIdPagination: true,
  parallelPages: 4,
  pageSize: 2000,
  maximumFeatures,
  kind: 'line',
});

export function createDetailSources(maximumZoom) {
  return {
    nhdMajorRivers: {
      file: 'usgs/nhdplus_hr_major_rivers.geojson',
      ...pagedNhdSource(NHD_MAJOR_WHERE, 0.00025, 2000000),
      minimumZoom: 9,
      maximumZoom,
    },
    nhdLocalRivers: {
      file: 'usgs/nhdplus_hr_local_rivers.geojson',
      ...pagedNhdSource(NHD_LOCAL_WHERE, 0.0001, 100000),
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
    mainRoads: {
      file: 'census/census_2025_main_roads_42k.geojsonseq',
      url: transportationUrl(7, 0.00005, 5, MAIN_ROAD_WHERE),
      idsUrl: transportationIdsUrl(7, MAIN_ROAD_WHERE),
      objectIdPagination: true,
      cacheFormat: 'geojsonseq',
      parallelPages: 4,
      pageSize: 2000,
      maximumFeatures: 30000,
      minimumZoom: 15,
      maximumZoom,
      kind: 'line',
    },
    localRoads: {
      file: 'census/census_2025_ranked_local_roads_42k.geojsonseq',
      url: transportationUrl(7, 0.00005, 5, LOCAL_ROAD_WHERE),
      idsUrl: transportationIdsUrl(7, LOCAL_ROAD_WHERE),
      objectIdPagination: true,
      cacheFormat: 'geojsonseq',
      parallelPages: 4,
      pageSize: 2000,
      maximumFeatures: 600000,
      minimumZoom: 16,
      maximumZoom,
      kind: 'line',
    },
    detailedLocalRoads: {
      file: 'census/census_2025_detailed_local_roads_42k.geojsonseq',
      url: transportationUrl(7, 0.000025, 5, DETAIL_ROAD_WHERE),
      idsUrl: transportationIdsUrl(7, DETAIL_ROAD_WHERE),
      objectIdPagination: true,
      cacheFormat: 'geojsonseq',
      parallelPages: 4,
      pageSize: 2000,
      maximumFeatures: 36000,
      minimumZoom: 17,
      maximumZoom: 17,
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
