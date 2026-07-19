import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  assembleLocaleResource,
  readLocaleManifest,
} from '../../scripts/locales/resources.mjs';

export const localeSourceUrl = new URL('../../locales/', import.meta.url);
export const localeSourceRoot = fileURLToPath(localeSourceUrl);

export function readLocaleSource(locale) {
  return assembleLocaleResource(locale, localeSourceRoot);
}

export function readSourceLocaleManifest() {
  return readLocaleManifest(localeSourceRoot);
}

export function createLocaleSourceFetcher() {
  return async (url) => {
    try {
      const file = fileURLToPath(url);
      const name = path.basename(file);
      const value =
        name === 'manifest.json'
          ? JSON.parse(await readFile(file, 'utf8'))
          : await readLocaleSource(name.replace(/\.json$/, ''));
      return { ok: true, json: async () => value };
    } catch {
      return { ok: false, status: 404 };
    }
  };
}
