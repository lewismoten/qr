import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { describe, test } from 'node:test';

const guideRoot = new URL('../guides/', import.meta.url);
const localizedSuffix = /\.(ar|es|hi-IN|zh-CN)\.html$/;

async function listGuidePages(directory = guideRoot, prefix = '') {
  const entries = await readdir(directory, { withFileTypes: true });
  const pages = await Promise.all(
    entries.map(async (entry) => {
      const path = prefix + entry.name;
      if (entry.isDirectory()) {
        return listGuidePages(new URL(entry.name + '/', directory), path + '/');
      }
      return entry.name.endsWith('.html') && path !== 'index.html'
        ? [path]
        : [];
    }),
  );
  return pages.flat().sort();
}

const englishPages = (pages) =>
  pages.filter((page) => !localizedSuffix.test(page));

const localePages = (pages, locale) =>
  pages.filter(
    (page) =>
      page.endsWith(`.${locale}.html`) && page !== `index.${locale}.html`,
  );

describe('guide index', () => {
  test('links to every standalone guide page', async () => {
    const [index, allPages] = await Promise.all([
      readFile(new URL('index.html', guideRoot), 'utf8'),
      listGuidePages(),
    ]);
    const pages = englishPages(allPages);
    assert.equal(pages.length, 22);
    await Promise.all(
      pages.map(async (page) => {
        assert.match(index, new RegExp(`href="${page.replace('.', '\\.')}"`));
        const source = await readFile(new URL(page, guideRoot), 'utf8');
        const guideIndex = page.includes('/') ? '../index.html' : 'index.html';
        assert.match(source, /<footer[\s>]/);
        assert.match(source, new RegExp(`href="${guideIndex}"`));
      }),
    );
  });

  test('localized indexes link to every translated guide copy', async () => {
    const pages = await listGuidePages();
    await Promise.all(
      ['ar', 'es', 'hi-IN', 'zh-CN'].map(async (locale) => {
        const index = await readFile(
          new URL(`index.${locale}.html`, guideRoot),
          'utf8',
        );
        const translatedPages = localePages(pages, locale);
        assert.equal(translatedPages.length, 22);
        translatedPages.forEach((page) => {
          assert.match(index, new RegExp(`href="${page.replace('.', '\\.')}`));
        });
      }),
    );
  });

  test('is canonical and included in the sitemap', async () => {
    const [index, sitemap] = await Promise.all([
      readFile(new URL('index.html', guideRoot), 'utf8'),
      readFile(new URL('../sitemap.xml', import.meta.url), 'utf8'),
    ]);
    assert.match(index, /rel="canonical"/);
    assert.match(sitemap, /https:\/\/qr\.lewismoten\.com\/guides\//);
  });
});
