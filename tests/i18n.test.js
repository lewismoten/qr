import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  getActiveLocale,
  getAvailableLocales,
  getErrorText,
  getTranslationEntries,
  initializeLanguage,
  isDebugLanguage,
  lookup,
} from '../src/js/i18n/index.js';
import { getSavedLocale, LOCALE_STORAGE_KEY, prioritizeLocales } from '../src/js/i18n/picker.js';
import {
  validateGeoLabel,
  validatePrintableText,
  validateVCardTextValue,
} from '../src/js/app/validation.js';

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

assert.equal(getSavedLocale({ getItem: (key) => key === LOCALE_STORAGE_KEY ? 'es' : null }), 'es');
assert.equal(getSavedLocale({ getItem: () => { throw new Error('Storage blocked'); } }), undefined);
assert.deepEqual(
  prioritizeLocales([
    { code: 'en-US' },
    { code: 'zh-CN' },
    { code: 'hi-IN' },
    { code: 'es' },
    { code: 'en-GB' },
    { code: 'en-XA', debug: true },
  ], ['es-MX', 'en-GB']).map(({ code }) => code),
  ['es', 'en-GB', 'en-US', 'zh-CN', 'hi-IN', 'en-XA'],
);

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
let functionCalls = 0;
assert.equal(lookup('navigation.repeated', '{value} + {value}', {
  value: ({ key, tag, locale }) => {
    functionCalls += 1;
    assert.deepEqual({ key, tag, locale }, {
      key: 'navigation.repeated',
      tag: 'value',
      locale: 'fr',
    });
    return 4;
  },
}), '4 + 4');
assert.equal(functionCalls, 1);
assert.equal(getErrorText({
  message: 'Minimum version is 9.',
  i18nKey: 'qr.errors.minimumVersion',
  i18nOptions: { version: 9 },
}), 'La version minimale est 9.');

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
        { code: 'en-XA', flag: '🐞', name: 'Debug', nativeName: 'Translation keys' },
      ],
    },
    'en-US.json': { navigation: { content: 'Content' } },
    'en-XA.json': { $debug: true },
  }),
});
assert.equal(getActiveLocale(), 'en-XA');
assert.equal(isDebugLanguage(), true);
assert.equal(lookup('navigation.content', 'Content'), 'navigation.content');
assert.equal(lookup('common.sequence', '{current} of {total}', { current: 1, total: 4 }), 'common.sequence');
assert.deepEqual(getAvailableLocales()[1], {
  code: 'en-XA',
  flag: '🐞',
  name: 'Debug',
  nativeName: 'Translation keys',
});
assert.equal(
  (await getTranslationEntries('navigation.content')).find(({ code }) => code === 'en-US')?.value,
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

const flattenMessages = (value, prefix = '', result = {}) => {
  Object.entries(value).forEach(([name, child]) => {
    const key = prefix ? `${prefix}.${name}` : name;
    if (child && typeof child === 'object' && !Array.isArray(child)) flattenMessages(child, key, result);
    else result[key] = child;
  });
  return result;
};
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const htmlKeys = [...new Set([...html.matchAll(/data-i18n(?:-[a-z-]+)?="([^"]+)"/g)].map((match) => match[1]))];
const formControls = html.match(/<(?:input|textarea)\b[^>]*>/gs) || [];
const fileControls = formControls.filter((tag) => /\btype=["']file["']/.test(tag));
assert.equal(fileControls.length, 4, 'All expected file pickers should be present');
assert.ok(
  fileControls.every((tag) => /\bclass=["'][^"']*file-picker-input/.test(tag)),
  'File inputs must use the localized custom picker',
);
assert.deepEqual(
  formControls.filter((tag) => /\bplaceholder=/.test(tag) && !/\bdata-i18n-placeholder=/.test(tag)),
  [],
  'All user-facing placeholders must be localized',
);
for (const id of ['phone-number', 'sms-number', 'event-title', 'geo-query', 'vcard-name', 'vcard-org', 'vcard-title', 'vcard-phone', 'vcard-email', 'vcard-url']) {
  const tag = formControls.find((control) => new RegExp(`\\bid=["']${id}["']`).test(control));
  assert.match(tag || '', /\bdata-i18n-value=/, `${id} must localize its default value`);
}
const scopedFormKeys = htmlKeys.filter((key) => /^(content|formats|fields|form|style|frame|wifi|common|downloadUi|debugUi|encoding)\./.test(key));
const englishMessages = flattenMessages(JSON.parse(await readFile(new URL('../locales/en-US.json', import.meta.url), 'utf8')));
const runtimeDownloadKeys = Object.keys(englishMessages).filter((key) => key.startsWith('download.'));
const bulkProgressKeys = Object.keys(englishMessages).filter((key) => key.startsWith('bulk.progress.'));
for (const locale of ['en-US', 'es', 'zh-CN', 'hi-IN', 'ar']) {
  const localeMessages = flattenMessages(JSON.parse(await readFile(new URL(`../locales/${locale}.json`, import.meta.url), 'utf8')));
  const requiredKeys = locale === 'en-US' ? htmlKeys : scopedFormKeys;
  assert.deepEqual(requiredKeys.filter((key) => !(key in localeMessages)), [], `${locale} is missing form translations`);
  assert.deepEqual(runtimeDownloadKeys.filter((key) => !(key in localeMessages)), [], `${locale} is missing download status translations`);
  assert.deepEqual(bulkProgressKeys.filter((key) => !(key in localeMessages)), [], `${locale} is missing CSV progress translations`);
}

assert.equal(validatePrintableText('ARTÍCULO-项目', { label: 'prefix', maxLength: 32 }), '');
assert.equal(validateGeoLabel('弗朗特罗亚尔，弗吉尼亚州'), '');
assert.equal(validateVCardTextValue('अभियंता', { label: 'title' }), '');

console.log('Language lookup and locale fallback tests passed.');
