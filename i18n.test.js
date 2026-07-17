import assert from 'node:assert/strict';
import { getActiveLocale, initializeLanguage, lookup } from './src/js/i18n/index.js';

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
    'fr.json': { navigation: { content: 'Contenu' } },
    'en-US.json': { navigation: { content: 'Content' } },
  }),
});
assert.equal(getActiveLocale(), 'fr');
assert.equal(lookup('navigation.content', 'Content'), 'Contenu');
assert.equal(lookup('navigation.missing', 'Fallback'), 'Fallback');

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
