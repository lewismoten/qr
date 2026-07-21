import {
  mkdir,
  open,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';

import { MEDIA_TYPE_FORM } from '../../src/js/app/media-types.js';
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

function parseObjectIds(content, url) {
  let result;
  try {
    result = JSON.parse(content);
  } catch {
    throw new Error(`Map source did not return valid object IDs: ${url}`);
  }
  if (!Array.isArray(result.objectIds)) {
    throw new Error(`Map source did not return object IDs: ${url}`);
  }
  return result.objectIds;
}

const wait = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

async function fetchWithRetry(url, options, attempts = 3) {
  let response;
  let failure;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      response = await fetch(url, options);
      if (response.ok || response.status < 500) return response;
      failure = new Error(`Map source returned ${response.status}: ${url}`);
    } catch (error) {
      failure = error;
    }
    if (attempt + 1 < attempts) await wait(500 * 2 ** attempt);
  }
  throw failure;
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

async function downloadObjectIdCollection(name, source, formatBytes) {
  const ids = await downloadObjectIds(name, source, formatBytes);
  const pages = new Array(Math.ceil(ids.length / source.pageSize));
  let nextPage = 0;
  let received = 0;
  process.stdout.write(`\rDownloading ${name}: 0/${ids.length} features`);
  const worker = async () => {
    while (nextPage < pages.length) {
      const pageIndex = nextPage;
      nextPage += 1;
      const features = await downloadObjectIdPage(
        name,
        source,
        formatBytes,
        ids.slice(
          pageIndex * source.pageSize,
          (pageIndex + 1) * source.pageSize,
        ),
      );
      pages[pageIndex] = features;
      received += features.length;
      showFeatureProgress(name, received, ids.length);
    }
  };
  const workers = Math.min(source.parallelPages ?? 1, pages.length);
  await Promise.all(Array.from({ length: workers }, worker));
  const collection = {
    type: 'FeatureCollection',
    features: pages.flat(),
  };
  return { collection, content: Buffer.from(JSON.stringify(collection)) };
}

async function downloadObjectIds(name, source, formatBytes) {
  const idsContent = await readResponse(
    await fetchWithRetry(source.idsUrl),
    `${name} index`,
    formatBytes,
    false,
  );
  const ids = parseObjectIds(idsContent, source.idsUrl);
  if (source.maximumFeatures && ids.length > source.maximumFeatures) {
    throw new Error(
      `${name} returned ${ids.length.toLocaleString()} features; ` +
        `the configured limit is ${source.maximumFeatures.toLocaleString()}.`,
    );
  }
  return ids;
}

async function downloadObjectIdPage(name, source, formatBytes, ids) {
  const request = {
    method: 'POST',
    headers: { 'content-type': MEDIA_TYPE_FORM },
    body: `objectIds=${ids.join(',')}`,
  };
  const content = await readResponse(
    await fetchWithRetry(source.url, request),
    name,
    formatBytes,
    false,
  );
  return parseCollection(content, source.url).features;
}

function showFeatureProgress(name, received, total) {
  process.stdout.write(`\rDownloading ${name}: ${received}/${total} features`);
}

async function downloadObjectIdSequence(name, source, file, formatBytes) {
  const ids = await downloadObjectIds(name, source, formatBytes);
  const temporary = `${file}.tmp`;
  const output = await open(temporary, 'w');
  let received = 0;
  showFeatureProgress(name, received, ids.length);
  try {
    const batchSize = source.pageSize * (source.parallelPages ?? 1);
    for (let offset = 0; offset < ids.length; offset += batchSize) {
      const batch = ids.slice(offset, offset + batchSize);
      const pages = [];
      for (let index = 0; index < batch.length; index += source.pageSize) {
        pages.push(
          downloadObjectIdPage(
            name,
            source,
            formatBytes,
            batch.slice(index, index + source.pageSize),
          ),
        );
      }
      for (const features of await Promise.all(pages)) {
        await output.write(`${features.map(JSON.stringify).join('\n')}\n`);
        received += features.length;
        showFeatureProgress(name, received, ids.length);
      }
    }
    await output.close();
    await rename(temporary, file);
    const { size } = await stat(file);
    process.stdout.write(
      `\rDownloaded ${name}: ${formatBytes(size)} (${received} features)\n`,
    );
  } catch (error) {
    await output.close().catch(() => {});
    await rm(temporary, { force: true });
    throw error;
  }
}

async function downloadCollection(name, source, formatBytes) {
  if (source.objectIdPagination) {
    return downloadObjectIdCollection(name, source, formatBytes);
  }
  if (!source.pageSize) {
    const content = await readResponse(
      await fetchWithRetry(source.url),
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
      await fetchWithRetry(url),
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
    const details = await stat(file);
    if (source.cacheFormat === 'geojsonseq') return details.size > 0;
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
  if (source.cacheFormat === 'geojsonseq') {
    await downloadObjectIdSequence(name, source, file, formatBytes);
    return { name, path: file, source };
  }
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
