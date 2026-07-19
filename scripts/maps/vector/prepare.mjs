import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

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

export async function prepareVectorInputs({ cache, output }) {
  await mkdir(output, { recursive: true });
  const prepared = [];
  for (const [layer, names] of Object.entries(VECTOR_LAYERS)) {
    const lines = [];
    for (const name of names) {
      const source = MAP_SOURCES[name];
      const file = path.join(cache, source.file);
      const collection = JSON.parse(await readFile(file, 'utf8'));
      for (const feature of collection.features) {
        const normalized = prepareVectorFeature(name, feature);
        if (normalized) lines.push(JSON.stringify(normalized));
      }
    }
    const file = path.join(output, `${layer}.geojsonseq`);
    await writeFile(file, `${lines.join('\n')}\n`);
    prepared.push({ layer, file, features: lines.length });
  }
  return prepared;
}

export function validateVectorLayers() {
  for (const name of Object.keys(MAP_SOURCES)) {
    if (!sourceLayer(name)) throw new Error(`No vector layer for ${name}.`);
  }
}
