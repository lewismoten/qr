import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, test } from 'node:test';

import {
  GUIDE_LOCALES,
  GUIDE_ROUTES,
  getGuideOutputPath,
} from '../../src/js/i18n/guide-routes.js';

const translatedLocales = ['en-GB', 'ar', 'es', 'hi-IN', 'zh-CN'];
const siteOrigin = 'https://qr.lewismoten.com';

function attributesOf(source) {
  return Object.fromEntries(
    [...source.matchAll(/([\w-]+)=(['"])(.*?)\2/g)].map((match) => [
      match[1],
      match[3],
    ]),
  );
}

function externalLinks(source) {
  return [...source.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a\s*>/gi)]
    .map((match) => ({
      attributes: attributesOf(match[1]),
      content: match[2],
    }))
    .filter(({ attributes }) => {
      if (!/^https?:\/\//.test(attributes.href || '')) return false;
      return new URL(attributes.href).origin !== siteOrigin;
    });
}

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
    assert.match(spanish, /\/es\/especificacion-qr\.html/);
    assert.match(spanish, /hreflang="x-default"/);
    assert.match(spanish, /"@lewismoten\/qr": "\.\.\/dist\/qr\.min\.js"/);
    assert.doesNotMatch(spanish, /"@lewismoten\/qr": "\.\.\/\.\.\/dist\//);
    assert.match(sitemap, /\/es\/especificacion-qr\.html/);
    assert.match(sitemap, /xmlns:xhtml=/);
  });

  test('privacy has a separate native page for every locale', async () => {
    for (const locale of translatedLocales) {
      const file = generatedPath('privacy', locale);
      const source = await readFile(file, 'utf8');
      assert.match(source, new RegExp(`lang="${locale}"`));
      assert.match(source, /class="guide-language-switcher"/);
      assert.match(source, /rel="canonical"/);
    }
  });

  test('external resources identify their content language', async () => {
    for (const locale of GUIDE_LOCALES) {
      for (const route of GUIDE_ROUTES) {
        const source = await readFile(generatedPath(route, locale), 'utf8');
        for (const link of externalLinks(source)) {
          const language = link.attributes.hreflang;
          assert.ok(language, `${locale}/${route}: ${link.attributes.href}`);
          assert.equal(link.attributes['data-resource-language'], language);
          const mismatched = !locale.startsWith('en') && language !== locale;
          assert.equal(
            link.content.includes('resource-language-indicator'),
            mismatched,
            `${locale}/${route}: ${link.attributes.href}`,
          );
        }
      }
    }
  });

  test('known resources use verified native-language pages', async () => {
    const spanish = await readFile(generatedPath('technology', 'es'), 'utf8');
    const arabic = await readFile(generatedPath('technology', 'ar'), 'utf8');
    const hindi = await readFile(generatedPath('technology', 'hi-IN'), 'utf8');
    const chinese = await readFile(
      generatedPath('technology', 'zh-CN'),
      'utf8',
    );

    assert.match(spanish, /iso\.org\/es\/contents\/data\/standard/);
    assert.match(spanish, /openstreetmap\.org\/copyright\/es/);
    assert.match(arabic, /openstreetmap\.org\/copyright\/ar/);
    assert.match(chinese, /openstreetmap\.org\/copyright\/zh-CN/);
    const hindiCopyright = externalLinks(hindi).find(({ attributes }) =>
      attributes.href.includes('openstreetmap.org/copyright'),
    );
    assert.equal(hindiCopyright.attributes.hreflang, 'en');
    assert.match(hindiCopyright.content, /resource-language-indicator/);
  });
});
