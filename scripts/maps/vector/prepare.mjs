import { createReadStream, createWriteStream } from 'node:fs';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';

import { MAP_SOURCES } from '../source-config.mjs';
import { sourceLayer, vectorProperties, VECTOR_LAYERS } from './layers.mjs';

const VECTOR_MAXIMUM_ZOOMS = new Map([
  ['countries', 10],
  ['lakes', 10],
]);

function matchesFilter(feature, filter) {
  if (!filter) return true;
  return !filter.exclude.includes(feature.properties?.[filter.property]);
}

function featureZoom(source, properties = {}) {
  const suggested =
    properties.min_zoom ??
    properties.MIN_ZOOM ??
    source.featureMinimumZoom?.(properties);
  const minimum = Number.isFinite(Number(suggested))
    ? Math.ceil(Number(suggested))
    : source.minimumZoom;
  const minzoom = Math.max(source.minimumZoom, minimum);
  const maxzoom = Math.min(
    source.maximumZoom,
    VECTOR_MAXIMUM_ZOOMS.get(source.name) ?? source.maximumZoom,
  );
  if (minzoom > maxzoom) return null;
  return {
    minzoom,
    maxzoom,
  };
}

function vectorGeometry(name, geometry) {
  if (sourceLayer(name) !== 'boundary') return geometry;
  if (geometry.type === 'Polygon') {
    return { type: 'MultiLineString', coordinates: geometry.coordinates };
  }
  if (geometry.type === 'MultiPolygon') {
    return {
      type: 'MultiLineString',
      coordinates: geometry.coordinates.flat(),
    };
  }
  return geometry;
}

export function prepareVectorFeature(name, feature) {
  const configured = MAP_SOURCES[name];
  const source = configured ? { ...configured, name } : null;
  if (!source || !feature?.geometry) return null;
  if (!matchesFilter(feature, source.featureFilter)) return null;
  const tippecanoe = featureZoom(source, feature.properties);
  if (!tippecanoe) return null;
  return {
    type: 'Feature',
    geometry: vectorGeometry(name, feature.geometry),
    properties: vectorProperties(name, feature.properties),
    tippecanoe,
  };
}

async function* readFeatures(file, source) {
  if (source.cacheFormat !== 'geojsonseq') {
    const collection = JSON.parse(await readFile(file, 'utf8'));
    yield* collection.features;
    return;
  }
  const lines = createInterface({
    input: createReadStream(file),
    crlfDelay: Infinity,
  });
  for await (const line of lines) {
    if (line) yield JSON.parse(line);
  }
}

async function writeFeature(output, feature, hash) {
  const line = `${JSON.stringify(feature)}\n`;
  hash.update(line);
  if (!output.write(line)) {
    await once(output, 'drain');
  }
}

export async function prepareVectorInputs({ cache, output }) {
  await mkdir(output, { recursive: true });
  const prepared = [];
  for (const [layer, names] of Object.entries(VECTOR_LAYERS)) {
    const file = path.join(output, `${layer}.geojsonseq`);
    const target = createWriteStream(file);
    const hash = createHash('sha256');
    let features = 0;
    const featuresByMinimumZoom = {};
    const featuresByZoomRange = {};
    for (const name of names) {
      const source = MAP_SOURCES[name];
      const sourceFile = path.join(cache, source.file);
      for await (const feature of readFeatures(sourceFile, source)) {
        const normalized = prepareVectorFeature(name, feature);
        if (!normalized) continue;
        await writeFeature(target, normalized, hash);
        features += 1;
        const zoom = normalized.tippecanoe.minzoom;
        featuresByMinimumZoom[zoom] = (featuresByMinimumZoom[zoom] || 0) + 1;
        const range = `${zoom}-${normalized.tippecanoe.maxzoom}`;
        featuresByZoomRange[range] = (featuresByZoomRange[range] || 0) + 1;
      }
    }
    target.end();
    await once(target, 'finish');
    prepared.push({
      layer,
      file,
      features,
      featuresByMinimumZoom,
      featuresByZoomRange,
      hash: hash.digest('hex'),
    });
  }
  return prepared;
}

export function validateVectorLayers() {
  for (const name of Object.keys(MAP_SOURCES)) {
    if (!sourceLayer(name)) throw new Error(`No vector layer for ${name}.`);
  }
}
