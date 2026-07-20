import { inflateRawSync } from 'node:zlib';

function firstZipEntry(buffer) {
  let end = buffer.length - 22;
  while (end >= 0 && buffer.readUInt32LE(end) !== 0x06054b50) end -= 1;
  if (end < 0) {
    throw new Error('GeoNames source is not a ZIP archive.');
  }
  const directory = buffer.readUInt32LE(end + 16);
  if (buffer.readUInt32LE(directory) !== 0x02014b50) {
    throw new Error('GeoNames ZIP central directory is invalid.');
  }
  const method = buffer.readUInt16LE(directory + 10);
  const size = buffer.readUInt32LE(directory + 20);
  const local = buffer.readUInt32LE(directory + 42);
  const nameLength = buffer.readUInt16LE(local + 26);
  const extraLength = buffer.readUInt16LE(local + 28);
  const start = local + 30 + nameLength + extraLength;
  const compressed = buffer.subarray(start, start + size);
  if (method === 0) return compressed;
  if (method === 8) return inflateRawSync(compressed);
  throw new Error(`Unsupported GeoNames ZIP compression method: ${method}`);
}

function placeZoom(population, featureCode) {
  if (featureCode.startsWith('PPLC') || population >= 500000) return 7;
  if (featureCode === 'PPLA' || population >= 50000) return 8;
  if (population >= 10000) return 9;
  if (population >= 5000) return 10;
  if (population >= 2000) return 11;
  return 12;
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
