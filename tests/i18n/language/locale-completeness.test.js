import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, test } from 'node:test';

import {
  createLocaleLoader,
  DEFAULT_LOCALE,
} from '../../../src/js/i18n/locale-resources.js';

const localeRoot = new URL('../../../locales/', import.meta.url);

async function readJson(url) {
  return JSON.parse(await readFile(url, 'utf8'));
}

function createFileFetcher() {
  return async (url) => {
    try {
      const value = await readJson(url);
      return {
        ok: true,
        json: async () => value,
      };
    } catch {
      return {
        ok: false,
        status: 404,
      };
    }
  };
}

function flattenMessages(value, prefix = '', output = {}) {
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === 'object' && !Array.isArray(child)) {
      flattenMessages(child, path, output);
    } else {
      output[path] = child;
    }
  }
  return output;
}

function getTags(value) {
  if (typeof value !== 'string') return [];
  return [...value.matchAll(/\{([A-Za-z][A-Za-z0-9]*)\}/g)]
    .map((match) => match[1])
    .sort();
}

describe('locale completeness', () => {
  test('locales contain every en-US value directly or through parents', async () => {
    const manifest = await readJson(new URL('manifest.json', localeRoot));
    const loadLocale = createLocaleLoader(createFileFetcher(), localeRoot);
    const baseline = flattenMessages(await loadLocale(DEFAULT_LOCALE));
    const productionLocales = manifest.locales.filter(
      (locale) => locale.debug !== true,
    );

    for (const locale of productionLocales) {
      const messages = flattenMessages(await loadLocale(locale.code));
      const missing = Object.keys(baseline).filter(
        (key) => !Object.hasOwn(messages, key),
      );

      assert.deepEqual(missing, [], `${locale.code} is missing locale values`);
    }
  });

  test('translated values preserve en-US interpolation tags', async () => {
    const manifest = await readJson(new URL('manifest.json', localeRoot));
    const loadLocale = createLocaleLoader(createFileFetcher(), localeRoot);
    const baseline = flattenMessages(await loadLocale(DEFAULT_LOCALE));
    const productionLocales = manifest.locales.filter(
      (locale) => locale.debug !== true,
    );

    for (const locale of productionLocales) {
      const messages = flattenMessages(await loadLocale(locale.code));
      for (const [key, value] of Object.entries(baseline)) {
        assert.deepEqual(
          getTags(messages[key]),
          getTags(value),
          `${locale.code}.${key} has different interpolation tags`,
        );
      }
    }
  });
});
