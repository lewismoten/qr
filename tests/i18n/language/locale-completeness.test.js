import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  createLocaleLoader,
  DEFAULT_LOCALE,
} from '../../../src/js/i18n/locale-resources.js';
import {
  createLocaleSourceFetcher,
  localeSourceUrl,
  readSourceLocaleManifest,
} from '../../helpers/locales.js';

const localeRoot = localeSourceUrl;
const resourceMetadata = new Set(['$debug', 'extends']);

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
    const manifest = await readSourceLocaleManifest();
    const loadLocale = createLocaleLoader(
      createLocaleSourceFetcher(),
      localeRoot,
    );
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

  test('locales do not define keys absent from en-US', async () => {
    const manifest = await readSourceLocaleManifest();
    const loadLocale = createLocaleLoader(
      createLocaleSourceFetcher(),
      localeRoot,
    );
    const baseline = flattenMessages(await loadLocale(DEFAULT_LOCALE));
    const translatedLocales = manifest.locales.filter(
      (locale) => locale.code !== DEFAULT_LOCALE,
    );
    const extras = {};

    for (const locale of translatedLocales) {
      const messages = flattenMessages(await loadLocale(locale.code));
      const keys = Object.keys(messages).filter(
        (key) => !resourceMetadata.has(key) && !Object.hasOwn(baseline, key),
      );
      if (keys.length) extras[locale.code] = keys;
    }

    assert.deepEqual(
      extras,
      {},
      'Translation keys must also exist in the en-US locale.',
    );
  });

  test('translated values preserve en-US interpolation tags', async () => {
    const manifest = await readSourceLocaleManifest();
    const loadLocale = createLocaleLoader(
      createLocaleSourceFetcher(),
      localeRoot,
    );
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
