import assert from 'node:assert/strict';
import { getActiveLocale, getErrorText, initializeLanguage, lookup } from './src/js/i18n/index.js';

function createFetcher(resources) {
  return async (url) => {
    const name = new URL(url).pathname.split('/').pop();
    const value = resources[name];
    return {
      ok: value !== undefined,
      status: value === undefined ? 404 : 200,
      async json() { return value; },
    };
  };
}

const baseUrl = new URL('https://example.test/locales/');

await initializeLanguage({
  languages: ['fr-CA', 'en-US'],
  baseUrl,
  fetcher: createFetcher({
    'manifest.json': { defaultLocale: 'en-US', locales: ['en-US', 'fr'] },
    'fr.json': {
      navigation: { content: 'Contenu', greeting: 'Bonjour, {name}. {missing}' },
      qr: { errors: { minimumVersion: 'La version minimale est {version}.' } },
    },
    'en-US.json': { navigation: { content: 'Content' } },
  }),
});
assert.equal(getActiveLocale(), 'fr');
assert.equal(lookup('navigation.content', 'Content'), 'Contenu');
assert.equal(
  lookup('navigation.greeting', 'Hello, {name}.', { name: 'Lewis' }),
  'Bonjour, Lewis. {missing}',
);
assert.equal(lookup('navigation.missing', 'Fallback'), 'Fallback');
assert.equal(lookup('navigation.count', '{current} / {total}', { current: 0, total: 8 }), '0 / 8');
assert.equal(getErrorText({
  message: 'Minimum version is 9.',
  i18nKey: 'qr.errors.minimumVersion',
  i18nOptions: { version: 9 },
}), 'La version minimale est 9.');

await initializeLanguage({
  languages: ['de-DE'],
  baseUrl,
  fetcher: createFetcher({
    'manifest.json': { defaultLocale: 'en-US', locales: ['de-DE', 'en-US'] },
    'en-US.json': { navigation: { content: 'Content' } },
  }),
});
assert.equal(getActiveLocale(), 'en-US');
assert.equal(lookup('navigation.content', 'Fallback'), 'Content');

console.log('Language lookup and locale fallback tests passed.');
