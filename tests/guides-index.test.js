import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { describe, test } from 'node:test';

const guideRoot = new URL('../guides/', import.meta.url);

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

describe('guide index', () => {
  test('links to every standalone guide page', async () => {
    const [index, pages] = await Promise.all([
      readFile(new URL('index.html', guideRoot), 'utf8'),
      listGuidePages(),
    ]);
    assert.equal(pages.length, 19);
    pages.forEach((page) => {
      assert.match(index, new RegExp(`href="${page.replace('.', '\\.')}"`));
    });
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
