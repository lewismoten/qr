import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

async function readJson(file, optional = false) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    if (optional && error.code === 'ENOENT') return undefined;
    throw error;
  }
}

async function assembleDirectory(directory, locale) {
  const source = await readJson(path.join(directory, `${locale}.json`), true);
  const entries = await readdir(directory, { withFileTypes: true });
  const folders = entries
    .filter((entry) => entry.isDirectory())
    .sort((left, right) => left.name.localeCompare(right.name));
  const result = source === undefined ? {} : source;
  if (!isObject(result) && folders.length) {
    throw new Error(`${directory}/${locale}.json must contain an object.`);
  }
  let found = source !== undefined;
  for (const folder of folders) {
    const child = await assembleDirectory(
      path.join(directory, folder.name),
      locale,
    );
    if (child === undefined) continue;
    if (Object.hasOwn(result, folder.name)) {
      throw new Error(
        `${directory}/${locale}.json duplicates folder key ${folder.name}.`,
      );
    }
    result[folder.name] = child;
    found = true;
  }
  return found ? result : undefined;
}

export async function readLocaleManifest(sourceRoot = 'locales') {
  return readJson(path.join(sourceRoot, 'manifest.json'));
}

export async function assembleLocaleResource(locale, sourceRoot = 'locales') {
  const resource = await assembleDirectory(sourceRoot, locale);
  if (!isObject(resource)) {
    throw new Error(`No locale source found for ${locale}.`);
  }
  return resource;
}

export async function buildLocaleResources({
  outputRoot = 'build/locales',
  sourceRoot = 'locales',
} = {}) {
  const manifest = await readLocaleManifest(sourceRoot);
  const locales = manifest.locales.map((entry) =>
    typeof entry === 'string' ? entry : entry.code,
  );
  await rm(outputRoot, { force: true, recursive: true });
  await mkdir(outputRoot, { recursive: true });
  await Promise.all(
    locales.map(async (locale) => {
      const resource = await assembleLocaleResource(locale, sourceRoot);
      await writeFile(
        path.join(outputRoot, `${locale}.json`),
        `${JSON.stringify(resource, null, 2)}\n`,
      );
    }),
  );
  await writeFile(
    path.join(outputRoot, 'manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  return locales;
}
