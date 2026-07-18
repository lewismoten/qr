import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  getActiveLocale,
  getTranslationEntries,
  initializeLanguage,
  preloadTranslationEntries,
  whenLanguageReady,
} from '../src/js/i18n/index.js';

const baseUrl = new URL('https://example.test/locales/');

function createFetcher(resources) {
  return async (url) => {
    const name = new URL(url).pathname.split('/').pop();
    const value = resources[name];
    return {
      ok: value !== undefined,
      status: value === undefined ? 404 : 200,
      json: async () => value,
    };
  };
}

test('language initialization works without a fetch implementation', async () => {
  const result = await initializeLanguage({ fetcher: null });
  assert.equal(result.loaded, false);
  assert.deepEqual(await getTranslationEntries('common.close'), []);
  assert.deepEqual(await preloadTranslationEntries(), []);
  assert.deepEqual(await whenLanguageReady(), result);
});

test('language initialization survives manifest discovery failure', async () => {
  const result = await initializeLanguage({
    baseUrl,
    fetcher: createFetcher({
      'en-US.json': { common: { close: 'Close' } },
    }),
  });
  assert.deepEqual(result, { locale: 'en-US', loaded: true });
});

test('language initialization reports complete resource failure', async () => {
  const result = await initializeLanguage({
    locale: 'fr',
    baseUrl,
    fetcher: createFetcher({
      'manifest.json': {
        defaultLocale: 'fr',
        locales: [],
      },
    }),
  });
  assert.deepEqual(result, { locale: 'fr', loaded: false });
  assert.equal(getActiveLocale(), 'fr');
});

test('translation entries tolerate one unavailable locale', async () => {
  await initializeLanguage({
    locale: 'en-US',
    baseUrl,
    fetcher: createFetcher({
      'manifest.json': {
        defaultLocale: 'en-US',
        locales: ['en-US', 'fr'],
      },
      'en-US.json': { common: { close: 'Close' } },
    }),
  });
  const entries = await getTranslationEntries('common.close');
  assert.equal(entries[0].value, 'Close');
  assert.equal(entries[1].value, undefined);
});
