import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  validateGeoLabel,
  validatePrintableText,
  validateVCardTextValue,
} from '../src/js/app/validation.js';

const flattenMessages = (value, prefix = '', result = {}) => {
  Object.entries(value).forEach(([name, child]) => {
    const key = prefix ? `${prefix}.${name}` : name;
    if (child && typeof child === 'object' && !Array.isArray(child)) {
      flattenMessages(child, key, result);
    } else {
      result[key] = child;
    }
  });
  return result;
};

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const htmlKeys = [
  ...new Set(
    [...html.matchAll(/data-i18n(?:-[a-z-]+)?="([^"]+)"/g)].map(
      (match) => match[1],
    ),
  ),
];
const formControls = html.match(/<(?:input|textarea)\b[^>]*>/gs) || [];
const fileControls = formControls.filter((tag) =>
  /\btype=["']file["']/.test(tag),
);
assert.equal(
  fileControls.length,
  4,
  'All expected file pickers should be present',
);
assert.ok(
  fileControls.every((tag) => /\bclass=["'][^"']*file-picker-input/.test(tag)),
  'File inputs must use the localized custom picker',
);
assert.deepEqual(
  formControls.filter(
    (tag) =>
      /\bplaceholder=/.test(tag) && !/\bdata-i18n-placeholder=/.test(tag),
  ),
  [],
  'All user-facing placeholders must be localized',
);
for (const id of [
  'phone-number',
  'sms-number',
  'event-title',
  'geo-query',
  'vcard-name',
  'vcard-org',
  'vcard-title',
  'vcard-phone',
  'vcard-email',
  'vcard-url',
]) {
  const tag = formControls.find((control) =>
    new RegExp(`\\bid=["']${id}["']`).test(control),
  );
  assert.match(
    tag || '',
    /\bdata-i18n-value=/,
    `${id} must localize its default value`,
  );
}
const scopedFormKeys = htmlKeys.filter((key) =>
  /^(content|formats|fields|form|style|frame|wifi|common|downloadUi|debugUi|encoding)\./.test(
    key,
  ),
);
const englishMessages = flattenMessages(
  JSON.parse(
    await readFile(new URL('../locales/en-US.json', import.meta.url), 'utf8'),
  ),
);
const runtimeDownloadKeys = Object.keys(englishMessages).filter((key) =>
  key.startsWith('download.'),
);
const bulkProgressKeys = Object.keys(englishMessages).filter((key) =>
  key.startsWith('bulk.progress.'),
);
for (const locale of ['en-US', 'es', 'zh-CN', 'hi-IN', 'ar']) {
  const localeMessages = flattenMessages(
    JSON.parse(
      await readFile(
        new URL(`../locales/${locale}.json`, import.meta.url),
        'utf8',
      ),
    ),
  );
  const requiredKeys = locale === 'en-US' ? htmlKeys : scopedFormKeys;
  assert.deepEqual(
    requiredKeys.filter((key) => !(key in localeMessages)),
    [],
    `${locale} is missing form translations`,
  );
  assert.deepEqual(
    runtimeDownloadKeys.filter((key) => !(key in localeMessages)),
    [],
    `${locale} is missing download status translations`,
  );
  assert.deepEqual(
    bulkProgressKeys.filter((key) => !(key in localeMessages)),
    [],
    `${locale} is missing CSV progress translations`,
  );
}

assert.equal(
  validatePrintableText('ARTÍCULO-项目', { label: 'prefix', maxLength: 32 }),
  '',
);
assert.equal(validateGeoLabel('弗朗特罗亚尔，弗吉尼亚州'), '');
assert.equal(validateVCardTextValue('अभियंता', { label: 'title' }), '');

console.log('Localization markup coverage tests passed.');
