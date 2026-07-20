import { createReadStream, createWriteStream } from 'node:fs';
import { once } from 'node:events';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';

import { MAP_SOURCES } from '../source-config.mjs';
import { sourceLayer, vectorProperties, VECTOR_LAYERS } from './layers.mjs';

function matchesFilter(feature, filter) {
  if (!filter) return true;
  return !filter.exclude.includes(feature.properties?.[filter.property]);
}

function featureZoom(source, properties = {}) {
  const suggested = properties.min_zoom ?? properties.MIN_ZOOM;
  const minimum = Number.isFinite(Number(suggested))
    ? Math.ceil(Number(suggested))
    : source.minimumZoom;
  return {
    minzoom: Math.max(source.minimumZoom, minimum),
    maxzoom: source.maximumZoom,
  };
}

export function prepareVectorFeature(name, feature) {
  const source = MAP_SOURCES[name];
  if (!source || !feature?.geometry) return null;
  if (!matchesFilter(feature, source.featureFilter)) return null;
  return {
    type: 'Feature',
    geometry: feature.geometry,
    properties: vectorProperties(name, feature.properties),
    tippecanoe: featureZoom(source, feature.properties),
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

async function writeFeature(output, feature) {
  if (!output.write(`${JSON.stringify(feature)}\n`)) {
    await once(output, 'drain');
  }
}

export async function prepareVectorInputs({ cache, output }) {
  await mkdir(output, { recursive: true });
  const prepared = [];
  for (const [layer, names] of Object.entries(VECTOR_LAYERS)) {
    const file = path.join(output, `${layer}.geojsonseq`);
    const target = createWriteStream(file);
    let features = 0;
    for (const name of names) {
      const source = MAP_SOURCES[name];
      const sourceFile = path.join(cache, source.file);
      for await (const feature of readFeatures(sourceFile, source)) {
        const normalized = prepareVectorFeature(name, feature);
        if (!normalized) continue;
        await writeFeature(target, normalized);
        features += 1;
      }
    }
    target.end();
    await once(target, 'finish');
    prepared.push({ layer, file, features });
  }
  return prepared;
}

export function validateVectorLayers() {
  for (const name of Object.keys(MAP_SOURCES)) {
    if (!sourceLayer(name)) throw new Error(`No vector layer for ${name}.`);
  }
}
