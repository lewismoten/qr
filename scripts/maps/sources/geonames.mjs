import { inflateRawSync } from 'node:zlib';

const ZIP_END_RECORD_BYTES = 22;
const ZIP_END_SIGNATURE = 0x06054b50;
const ZIP_CENTRAL_SIGNATURE = 0x02014b50;
const ZIP_METHOD_STORED = 0;
const ZIP_METHOD_DEFLATE = 8;
const ZIP_OFFSETS = {
  directory: 16,
  method: 10,
  compressedSize: 20,
  localHeader: 42,
  nameLength: 26,
  extraLength: 28,
  localData: 30,
};
const CAPITAL_POPULATION = 500_000;
const ADMINISTRATIVE_POPULATION = 50_000;
const LARGE_TOWN_POPULATION = 10_000;
const TOWN_POPULATION = 5_000;
const SMALL_TOWN_POPULATION = 2_000;
const CAPITAL_ZOOM = 7;
const ADMINISTRATIVE_ZOOM = 8;
const LARGE_TOWN_ZOOM = 9;
const TOWN_ZOOM = 10;
const SMALL_TOWN_ZOOM = 11;
const VILLAGE_ZOOM = 12;

function firstZipEntry(buffer) {
  let end = buffer.length - ZIP_END_RECORD_BYTES;
  while (end >= 0 && buffer.readUInt32LE(end) !== ZIP_END_SIGNATURE) end -= 1;
  if (end < 0) {
    throw new Error('GeoNames source is not a ZIP archive.');
  }
  const directory = buffer.readUInt32LE(end + ZIP_OFFSETS.directory);
  if (buffer.readUInt32LE(directory) !== ZIP_CENTRAL_SIGNATURE) {
    throw new Error('GeoNames ZIP central directory is invalid.');
  }
  const method = buffer.readUInt16LE(directory + ZIP_OFFSETS.method);
  const size = buffer.readUInt32LE(directory + ZIP_OFFSETS.compressedSize);
  const local = buffer.readUInt32LE(directory + ZIP_OFFSETS.localHeader);
  const nameLength = buffer.readUInt16LE(local + ZIP_OFFSETS.nameLength);
  const extraLength = buffer.readUInt16LE(local + ZIP_OFFSETS.extraLength);
  const start = local + ZIP_OFFSETS.localData + nameLength + extraLength;
  const compressed = buffer.subarray(start, start + size);
  if (method === ZIP_METHOD_STORED) return compressed;
  if (method === ZIP_METHOD_DEFLATE) return inflateRawSync(compressed);
  throw new Error(`Unsupported GeoNames ZIP compression method: ${method}`);
}

function placeZoom(population, featureCode) {
  if (featureCode.startsWith('PPLC') || population >= CAPITAL_POPULATION) {
    return CAPITAL_ZOOM;
  }
  if (featureCode === 'PPLA' || population >= ADMINISTRATIVE_POPULATION) {
    return ADMINISTRATIVE_ZOOM;
  }
  if (population >= LARGE_TOWN_POPULATION) return LARGE_TOWN_ZOOM;
  if (population >= TOWN_POPULATION) return TOWN_ZOOM;
  if (population >= SMALL_TOWN_POPULATION) return SMALL_TOWN_ZOOM;
  return VILLAGE_ZOOM;
}

export function parseGeoNamesText(text, sourceVersion = 1) {
  const features = text
    .trim()
    .split('\n')
    .map((line) => {
      const fields = line.replace(/\r$/, '').split('\t');
      const population = Number(fields[14]) || 0;
      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [Number(fields[5]), Number(fields[4])],
        },
        properties: {
          geonameid: fields[0],
          name: fields[1],
          country: fields[8],
          feature_code: fields[7],
          population,
          min_zoom: placeZoom(population, fields[7]),
          source_version: sourceVersion,
        },
      };
    });
  return { type: 'FeatureCollection', features };
}

export function parseGeoNames(buffer, sourceVersion) {
  return parseGeoNamesText(
    firstZipEntry(buffer).toString('utf8'),
    sourceVersion,
  );
}
