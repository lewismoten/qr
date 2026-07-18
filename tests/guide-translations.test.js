import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  collectGuideText,
  translateGuideHtml,
} from '../scripts/guide-translations.mjs';

const locales = ['ar', 'es', 'hi-IN', 'zh-CN'];
const localizedName = /\.(?:ar|es|hi-IN|zh-CN)\.html$/;

async function listEnglishGuides(directory = 'guides') {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const file = `${directory}/${entry.name}`;
      if (entry.isDirectory()) {
        return entry.name === 'translations' ? [] : listEnglishGuides(file);
      }
      return file.endsWith('.html') && !localizedName.test(file) ? [file] : [];
    }),
  );
  return files.flat();
}

test('guide translation preserves code and keyed UI content', () => {
  const source = [
    '<p title="Useful help">Translate this.</p>',
    '<code>FILE:1:S</code>',
    '<span data-i18n="common.open">Open</span>',
  ].join('');
  const translations = {
    'Translate this.': 'Traducir esto.',
    'Useful help': 'Ayuda util',
  };
  const result = translateGuideHtml(source, translations);

  assert.match(result, /title="Ayuda util">Traducir esto\.<\/p>/);
  assert.match(result, /<code>FILE:1:S<\/code>/);
  assert.match(result, />Open<\/span>/);
});

test('guide translation reports missing prose without changing it', () => {
  const source = '<p>Missing guide prose.</p><p>123</p>';

  assert.deepEqual(collectGuideText(source), ['Missing guide prose.']);
  assert.equal(translateGuideHtml(source, {}), source);
});

test('every supported locale translates all long-form guide prose', async () => {
  const files = await listEnglishGuides();
  const required = new Set();
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    collectGuideText(source).forEach((value) => required.add(value));
  }

  for (const locale of locales) {
    const source = await readFile(`guides/translations/${locale}.json`);
    const translations = JSON.parse(source);
    const missing = [...required].filter((value) => !translations[value]);
    assert.deepEqual(missing, [], `${locale} has untranslated guide prose`);
  }
});
