import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, test } from 'node:test';

import {
  GUIDE_LOCALES,
  GUIDE_ROUTES,
  getGuideOutputPath,
} from '../src/js/i18n/guide-routes.js';

const translatedLocales = ['ar', 'es', 'hi-IN', 'zh-CN'];

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
    const indexPath = getGuideOutputPath('index', 'en-US');
    const index = await readFile(indexPath, 'utf8');
    for (const route of GUIDE_ROUTES.filter((value) => value !== 'index')) {
      const output = getGuideOutputPath(route, 'en-US');
      const relative = escapedRelative(indexPath, output);
      assert.match(index, new RegExp(`href="${relative}"`));
      const source = await readFile(output, 'utf8');
      assert.match(source, /<footer[\s>]/);
      assert.match(source, /class="guide-language-switcher"/);
    }
  });

  test('localized indexes use native paths and equivalent links', async () => {
    for (const locale of translatedLocales) {
      const indexPath = getGuideOutputPath('index', locale);
      const index = await readFile(indexPath, 'utf8');
      for (const route of GUIDE_ROUTES.filter((value) => value !== 'index')) {
        const output = getGuideOutputPath(route, locale);
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
      readFile(getGuideOutputPath('spec', 'es'), 'utf8'),
      readFile('sitemaps/guides-es.xml', 'utf8'),
    ]);
    assert.match(spanish, /\/es\/guias\/especificacion-qr\.html/);
    assert.match(spanish, /hreflang="x-default"/);
    assert.match(sitemap, /\/es\/guias\/especificacion-qr\.html/);
    assert.match(sitemap, /xmlns:xhtml=/);
  });
});
