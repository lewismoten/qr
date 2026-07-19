import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { parseGeoNames } from './sources/geonames.mjs';

function parseCollection(content, url) {
  let collection;
  try {
    collection = JSON.parse(content);
  } catch {
    throw new Error(`Map source did not return valid JSON: ${url}`);
  }
  if (
    collection.type !== 'FeatureCollection' ||
    !Array.isArray(collection.features)
  ) {
    throw new Error(`Map source did not return GeoJSON: ${url}`);
  }
  return collection;
}

async function readResponse(response, name, formatBytes, showProgress = true) {
  if (!response.ok) {
    throw new Error(`Unable to download ${response.url}: ${response.status}`);
  }
  const total = Number(response.headers.get('content-length')) || 0;
  const encoded = response.headers.has('content-encoding');
  const reader = response.body.getReader();
  const chunks = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = Buffer.from(value);
    chunks.push(chunk);
    received += chunk.byteLength;
    const progress =
      total && !encoded
        ? `${Math.floor((received / total) * 100)}%`
        : formatBytes(received);
    if (showProgress) {
      process.stdout.write(`\rDownloading ${name}: ${progress}`);
    }
  }
  return Buffer.concat(chunks);
}

function pageUrl(source, offset) {
  const separator = source.url.includes('?') ? '&' : '?';
  return (
    source.url +
    separator +
    `orderByFields=OBJECTID&resultOffset=${offset}&` +
    `resultRecordCount=${source.pageSize}`
  );
}

async function downloadCollection(name, source, formatBytes) {
  if (!source.pageSize) {
    const content = await readResponse(
      await fetch(source.url),
      name,
      formatBytes,
    );
    const collection =
      source.format === 'geonames'
        ? parseGeoNames(content, source.cacheVersion)
        : parseCollection(content, source.url);
    return {
      collection,
      content: Buffer.from(JSON.stringify(collection)),
    };
  }
  const collection = { type: 'FeatureCollection', features: [] };
  let offset = 0;
  let previousFirstId;
  while (true) {
    const url = pageUrl(source, offset);
    const content = await readResponse(
      await fetch(url),
      name,
      formatBytes,
      false,
    );
    const page = parseCollection(content, url);
    const firstId = page.features[0]?.id;
    if (offset && firstId === previousFirstId) {
      throw new Error(`Map source pagination made no progress: ${source.url}`);
    }
    previousFirstId = firstId;
    collection.features.push(...page.features);
    process.stdout.write(
      `\rDownloading ${name}: ${collection.features.length} features`,
    );
    if (page.features.length < source.pageSize) break;
    offset += page.features.length;
  }
  return { collection, content: Buffer.from(JSON.stringify(collection)) };
}

async function validCache(file, source) {
  try {
    await stat(file);
    const collection = parseCollection(await readFile(file), file);
    return (
      !source.cacheVersion ||
      collection.features[0]?.properties?.source_version === source.cacheVersion
    );
  } catch {
    return false;
  }
}

export async function obtainMapSource({ name, source, cache, formatBytes }) {
  const file = path.join(cache, source.file);
  if (await validCache(file, source)) return { name, path: file, source };
  await mkdir(path.dirname(file), { recursive: true });
  console.log(`Downloading ${name}...`);
  const { content, collection } = await downloadCollection(
    name,
    source,
    formatBytes,
  );
  await writeFile(`${file}.tmp`, content);
  await rename(`${file}.tmp`, file);
  process.stdout.write(
    `\rDownloaded ${name}: ${formatBytes(content.byteLength)} ` +
      `(${collection.features.length} features)\n`,
  );
  return { name, path: file, source };
}
