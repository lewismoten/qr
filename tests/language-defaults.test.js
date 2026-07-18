import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  getActiveLocale,
  getErrorText,
  initializeLanguage,
  preloadTranslationEntries,
} from '../src/js/i18n/index.js';
import { getSavedLocale, setupLanguagePicker } from '../src/js/i18n/picker.js';

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

test('language defaults tolerate partial platform data', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { language: 'en-US' },
  });
  try {
    const result = await initializeLanguage({
      baseUrl,
      fetcher: createFetcher({
        'manifest.json': {
          defaultLocale: 'invalid_locale',
          locales: ['en-US'],
        },
        'en-US.json': { common: { close: 'Close' } },
      }),
    });
    assert.deepEqual(result, { locale: 'en-US', loaded: true });
    assert.equal(getActiveLocale(), 'en-US');
    assert.equal((await preloadTranslationEntries())[0].status, 'fulfilled');
    assert.equal(getSavedLocale({ getItem: () => null }), undefined);
    assert.doesNotThrow(() =>
      setupLanguagePicker({ document: { getElementById: () => null } }),
    );
    assert.equal(
      getErrorText({ i18nKey: 'missing', message: '' }, 'Fallback'),
      'Fallback',
    );
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'navigator', descriptor);
    else delete globalThis.navigator;
  }
});
