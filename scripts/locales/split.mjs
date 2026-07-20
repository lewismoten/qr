import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';

import { assembleLocaleResource, readLocaleManifest } from './resources.mjs';
import { localeSourcePath } from './locale-source-name.mjs';

const DEFAULT_KEYS = [
  'bulk',
  'content',
  'debugUi',
  'download',
  'downloadUi',
  'form',
  'style',
  'validation',
];

function parseKey(value) {
  const parts = value.split('.');
  if (!parts.every((part) => /^[A-Za-z][\w-]*$/.test(part))) {
    throw new Error(`Invalid locale key path: ${value}`);
  }
  return parts;
}

function getValue(source, parts) {
  return parts.reduce((value, part) => value?.[part], source);
}

async function readObject(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return {};
    throw error;
  }
}

async function splitLocale(locale, sourceRoot, keyPaths) {
  const before = await assembleLocaleResource(locale, sourceRoot);
  for (const parts of keyPaths) {
    const key = parts.at(-1);
    const parent = parts.slice(0, -1);
    const parentDirectory = path.join(sourceRoot, ...parent);
    const destinationDirectory = path.join(sourceRoot, ...parts);
    const parentFile = localeSourcePath(parentDirectory, locale, sourceRoot);
    const destination = localeSourcePath(
      destinationDirectory,
      locale,
      sourceRoot,
    );
    const source = await readObject(parentFile);
    if (!Object.hasOwn(source, key)) continue;
    const value = getValue(before, parts);
    delete source[key];
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, `${JSON.stringify(value, null, 2)}\n`);
    await writeFile(parentFile, `${JSON.stringify(source, null, 2)}\n`);
  }
  const after = await assembleLocaleResource(locale, sourceRoot);
  if (!isDeepStrictEqual(after, before)) {
    throw new Error(`Splitting changed the assembled ${locale} resource.`);
  }
}

export async function splitLocaleResources({
  keys = DEFAULT_KEYS,
  sourceRoot = 'locales',
} = {}) {
  const manifest = await readLocaleManifest(sourceRoot);
  const locales = manifest.locales.map((entry) =>
    typeof entry === 'string' ? entry : entry.code,
  );
  const keyPaths = keys.map(parseKey);
  for (const locale of locales) {
    await splitLocale(locale, sourceRoot, keyPaths);
  }
  return locales;
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const keys = process.argv.slice(2);
  const locales = await splitLocaleResources({
    keys: keys.length ? keys : DEFAULT_KEYS,
  });
  console.log(`Split ${locales.length} locale resources.`);
}
