import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, test } from 'node:test';

import {
  GUIDE_LOCALES,
  GUIDE_ROUTES,
  getGuideOutputPath,
} from '../src/js/i18n/guide-routes.js';

const translatedLocales = ['ar', 'es', 'hi-IN', 'zh-CN'];

function generatedPath(route, locale) {
  return `build/site/${getGuideOutputPath(route, locale)}`;
}

function escapedRelative(from, target) {
  const fromParts = from.split('/');
  fromParts.pop();
  const targetParts = target.split('/');
  while (fromParts[0] === targetParts[0]) {
    fromParts.shift();
    targetParts.shift();
  }
  let value = [...fromParts.map(() => '..'), ...targetParts].join('/');
  if (!value.startsWith('.')) value = './' + value;
  return value.replaceAll('.', '\\.');
}

describe('guide index', () => {
  test('English index links to every standalone guide page', async () => {
    const indexPath = generatedPath('index', 'en-US');
    const index = await readFile(indexPath, 'utf8');
    for (const route of GUIDE_ROUTES.filter((value) => value !== 'index')) {
      const output = generatedPath(route, 'en-US');
      const relative = escapedRelative(indexPath, output);
      assert.match(index, new RegExp(`href="${relative}"`));
      const source = await readFile(output, 'utf8');
      assert.match(source, /<footer[\s>]/);
      assert.match(source, /class="guide-language-switcher"/);
    }
  });

  test('localized indexes use native paths and equivalent links', async () => {
    for (const locale of translatedLocales) {
      const indexPath = generatedPath('index', locale);
      const index = await readFile(indexPath, 'utf8');
      for (const route of GUIDE_ROUTES.filter((value) => value !== 'index')) {
        const output = generatedPath(route, locale);
        const relative = escapedRelative(indexPath, output);
        assert.match(index, new RegExp(`href="${relative}"`));
      }
      GUIDE_LOCALES.forEach((targetLocale) => {
        assert.match(index, new RegExp(`hreflang="${targetLocale}"`));
      });
    }
  });

  test('canonicals and sitemap expose native localized routes', async () => {
    const [spanish, sitemap] = await Promise.all([
      readFile(generatedPath('spec', 'es'), 'utf8'),
      readFile('build/site/sitemaps/guides-es.xml', 'utf8'),
    ]);
    assert.match(spanish, /\/es\/guias\/especificacion-qr\.html/);
    assert.match(spanish, /hreflang="x-default"/);
    assert.match(spanish, /"@lewismoten\/qr": "\.\.\/\.\.\/dist\/qr\.min\.js"/);
    assert.doesNotMatch(spanish, /"@lewismoten\/qr": "\.\.\/dist\//);
    assert.match(sitemap, /\/es\/guias\/especificacion-qr\.html/);
    assert.match(sitemap, /xmlns:xhtml=/);
  });
});
