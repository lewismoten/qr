import assert from 'node:assert/strict';
import {
  getActiveLocale,
  getAvailableLocales,
  getErrorText,
  getTranslationEntries,
  initializeLanguage,
  isDebugLanguage,
  lookup,
} from '../src/js/i18n/index.js';
import {
  getSavedLocale,
  LOCALE_STORAGE_KEY,
  prioritizeLocales,
} from '../src/js/i18n/picker.js';

function createFetcher(resources) {
  return async (url) => {
    const name = new URL(url).pathname.split('/').pop();
    const value = resources[name];
    return {
      ok: value !== undefined,
      status: value === undefined ? 404 : 200,
      async json() {
        return value;
      },
    };
  };
}

const baseUrl = new URL('https://example.test/locales/');

assert.equal(
  getSavedLocale({
    getItem: (key) => (key === LOCALE_STORAGE_KEY ? 'es' : null),
  }),
  'es',
);
assert.equal(
  getSavedLocale({
    getItem: () => {
      throw new Error('Storage blocked');
    },
  }),
  undefined,
);
assert.deepEqual(
  prioritizeLocales(
    [
      { code: 'en-US' },
      { code: 'zh-CN' },
      { code: 'hi-IN' },
      { code: 'es' },
      { code: 'en-GB' },
      { code: 'en-XA', debug: true },
    ],
    ['es-MX', 'en-GB'],
  ).map(({ code }) => code),
  ['es', 'en-GB', 'en-US', 'zh-CN', 'hi-IN', 'en-XA'],
);

await initializeLanguage({
  languages: ['fr-CA', 'en-US'],
  baseUrl,
  fetcher: createFetcher({
    'manifest.json': { defaultLocale: 'en-US', locales: ['en-US', 'fr'] },
    'fr.json': {
      navigation: {
        content: 'Contenu',
        greeting: 'Bonjour, {name}. {missing}',
      },
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
assert.equal(
  lookup('navigation.count', '{current} / {total}', { current: 0, total: 8 }),
  '0 / 8',
);
let functionCalls = 0;
assert.equal(
  lookup('navigation.repeated', '{value} + {value}', {
    value: ({ key, tag, locale }) => {
      functionCalls += 1;
      assert.deepEqual(
        { key, tag, locale },
        {
          key: 'navigation.repeated',
          tag: 'value',
          locale: 'fr',
        },
      );
      return 4;
    },
  }),
  '4 + 4',
);
assert.equal(functionCalls, 1);
assert.equal(
  getErrorText({
    message: 'Minimum version is 9.',
    i18nKey: 'qr.errors.minimumVersion',
    i18nOptions: { version: 9 },
  }),
  'La version minimale est 9.',
);

await initializeLanguage({
  locale: 'en-GB',
  baseUrl,
  fetcher: createFetcher({
    'manifest.json': { defaultLocale: 'en-US', locales: ['en-US', 'en-GB'] },
    'en-US.json': {
      navigation: { content: 'Content' },
      fields: { organization: 'organization', title: 'title' },
    },
    'en-GB.json': {
      extends: 'en-US',
      fields: { organization: 'organisation' },
    },
  }),
});
assert.equal(getActiveLocale(), 'en-GB');
assert.equal(lookup('navigation.content', 'Fallback'), 'Content');
assert.equal(lookup('fields.organization', 'Fallback'), 'organisation');
assert.equal(lookup('fields.title', 'Fallback'), 'title');

await initializeLanguage({
  locale: 'en-XA',
  baseUrl,
  fetcher: createFetcher({
    'manifest.json': {
      defaultLocale: 'en-US',
      locales: [
        { code: 'en-US', flag: '🇺🇸' },
        {
          code: 'en-XA',
          flag: '🐞',
          name: 'Debug',
          nativeName: 'Translation keys',
        },
      ],
    },
    'en-US.json': { navigation: { content: 'Content' } },
    'en-XA.json': { $debug: true },
  }),
});
assert.equal(getActiveLocale(), 'en-XA');
assert.equal(isDebugLanguage(), true);
assert.equal(lookup('navigation.content', 'Content'), 'navigation.content');
assert.equal(
  lookup('common.sequence', '{current} of {total}', { current: 1, total: 4 }),
  'common.sequence',
);
assert.deepEqual(getAvailableLocales()[1], {
  code: 'en-XA',
  flag: '🐞',
  name: 'Debug',
  nativeName: 'Translation keys',
});
assert.equal(
  (await getTranslationEntries('navigation.content')).find(
    ({ code }) => code === 'en-US',
  )?.value,
  'Content',
);

await initializeLanguage({
  locale: 'en-US',
  languages: ['de-DE'],
  baseUrl,
  fetcher: createFetcher({
    'manifest.json': { defaultLocale: 'en-US', locales: ['de-DE', 'en-US'] },
    'en-US.json': { navigation: { content: 'Content' } },
  }),
});
assert.equal(getActiveLocale(), 'en-US');
assert.equal(isDebugLanguage(), false);
assert.equal(lookup('navigation.content', 'Fallback'), 'Content');
assert.deepEqual(getAvailableLocales(), [
  { code: 'de-DE', flag: '🏳️', name: undefined, nativeName: undefined },
  { code: 'en-US', flag: '🏳️', name: undefined, nativeName: undefined },
]);

console.log('Language lookup and locale fallback tests passed.');
