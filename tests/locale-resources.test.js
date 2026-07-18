import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  canonicalizeLocale,
  createLocaleLoader,
  fetchJson,
  findMessageIn,
  normalizeLocaleEntries,
  selectLocale,
} from '../src/js/i18n/locale-resources.js';

const baseUrl = new URL('https://example.test/locales/');

function createFetcher(resources, requests = []) {
  return async (url, options) => {
    const name = new URL(url).pathname.split('/').pop();
    const value = resources[name];
    requests.push({ name, options });
    return {
      ok: value !== undefined,
      status: value === undefined ? 404 : 200,
      json: async () => value,
    };
  };
}

describe('locale normalization and selection', () => {
  test('canonicalizes valid locale names', () => {
    assert.equal(canonicalizeLocale(' en-us '), 'en-US');
    assert.equal(canonicalizeLocale(''), undefined);
    assert.equal(canonicalizeLocale(null), undefined);
    assert.equal(canonicalizeLocale('not_a_locale'), undefined);
  });

  test('normalizes entries and removes duplicates', () => {
    assert.deepEqual(
      normalizeLocaleEntries([
        'en-us',
        { code: 'en-US', flag: 'duplicate' },
        {
          code: 'es',
          flag: '🇪🇸',
          name: 'Spanish',
          nativeName: 'Español',
          debug: true,
        },
        null,
        { code: 'invalid_locale' },
      ]),
      [
        {
          code: 'en-US',
          flag: '🏳️',
          name: undefined,
          nativeName: undefined,
        },
        {
          code: 'es',
          flag: '🇪🇸',
          name: 'Spanish',
          nativeName: 'Español',
          debug: true,
        },
      ],
    );
    assert.deepEqual(normalizeLocaleEntries('fr'), [
      {
        code: 'fr',
        flag: '🏳️',
        name: undefined,
        nativeName: undefined,
      },
    ]);
  });

  test('selects exact, language, fallback, and first matches', () => {
    assert.equal(selectLocale('es-MX', ['en-US', 'es'], 'en-US'), 'es');
    assert.equal(selectLocale('fr-CA', ['fr-FR', 'en-US'], 'en-US'), 'fr-FR');
    assert.equal(selectLocale('de', ['en-US', 'es'], 'en-US'), 'en-US');
    assert.equal(selectLocale('de', ['es'], 'invalid_locale'), 'es');
    assert.equal(selectLocale([], [], 'fr'), 'fr');
  });
});

describe('locale resources', () => {
  test('requests JSON and rejects failed responses', async () => {
    const requests = [];
    const fetcher = createFetcher({ 'en-US.json': { title: 'QR' } }, requests);
    assert.deepEqual(await fetchJson(fetcher, new URL('en-US.json', baseUrl)), {
      title: 'QR',
    });
    assert.deepEqual(requests[0].options, {
      headers: { Accept: 'application/json' },
    });
    await assert.rejects(
      fetchJson(fetcher, new URL('missing.json', baseUrl)),
      /404/,
    );
  });

  test('loads, merges, and caches inherited resources', async () => {
    const requests = [];
    const load = createLocaleLoader(
      createFetcher(
        {
          'en-US.json': {
            common: { close: 'Close', save: 'Save' },
            scalar: 'parent',
          },
          'en-GB.json': {
            extends: 'en-US',
            common: { save: 'Save changes' },
            scalar: { nested: true },
          },
        },
        requests,
      ),
      baseUrl,
    );
    const first = load('en-GB');
    assert.strictEqual(load('en-GB'), first);
    assert.deepEqual(await first, {
      common: { close: 'Close', save: 'Save changes' },
      scalar: { nested: true },
    });
    assert.deepEqual(
      requests.map(({ name }) => name),
      ['en-GB.json', 'en-US.json'],
    );
  });

  test('rejects invalid, malformed, and circular resources', async () => {
    const invalid = createLocaleLoader(createFetcher({}), baseUrl);
    await assert.rejects(invalid('invalid_locale'), /Invalid parent locale/);

    const malformed = createLocaleLoader(
      createFetcher({ 'en-US.json': [] }),
      baseUrl,
    );
    await assert.rejects(malformed('en-US'), /Invalid language resource/);

    const circular = createLocaleLoader(
      createFetcher({
        'en-US.json': { extends: 'fr' },
        'fr.json': { extends: 'en-US' },
      }),
      baseUrl,
    );
    await assert.rejects(circular('en-US'), /en-US -> fr -> en-US/);
  });

  test('finds only valid nested message keys', () => {
    const messages = { common: { close: 'Close' }, empty: null };
    assert.equal(findMessageIn(messages, 'common.close'), 'Close');
    assert.equal(findMessageIn(messages, 'common.missing'), undefined);
    assert.equal(findMessageIn(messages, ''), undefined);
    assert.equal(findMessageIn(messages, null), undefined);
    assert.equal(findMessageIn(messages, 'empty.value'), undefined);
  });
});
