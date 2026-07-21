import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { HANDBOOK_ROUTES } from '../../src/js/info/handbook/pages.js';
import {
  getGuideOutputPath,
  GUIDE_ROUTES,
} from '../../src/js/i18n/guide-routes.js';
import {
  buildHandbookOutline,
  getChapterId,
  prepareHandbookPages,
} from '../../src/js/info/handbook/document-model.js';

test('handbook includes every helpful route exactly once', () => {
  assert.equal(new Set(HANDBOOK_ROUTES).size, HANDBOOK_ROUTES.length);
  assert.equal(HANDBOOK_ROUTES.includes('index'), false);
  for (const route of GUIDE_ROUTES) {
    if (route !== 'index') assert.ok(HANDBOOK_ROUTES.includes(route), route);
  }
  assert.equal(HANDBOOK_ROUTES[0], 'about');
  assert.equal(HANDBOOK_ROUTES.at(-3), 'spec');
  assert.equal(HANDBOOK_ROUTES.at(-2), 'technology');
  assert.equal(HANDBOOK_ROUTES.at(-1), 'privacy');
});

test('handbook routes resolve to native localized paths', () => {
  assert.equal(getGuideOutputPath('technology', 'es'), 'es/tecnologia.html');
  assert.equal(
    getGuideOutputPath('content/email', 'zh-CN'),
    'zh-CN/指南/内容/电子邮件.html',
  );
});

test('handbook contents group guide sections hierarchically', () => {
  const pages = [
    { route: 'about', title: 'About' },
    { route: 'content/text', title: 'Text' },
    { route: 'content/email', title: 'Email' },
    { route: 'style/colors', title: 'Colors' },
    { route: 'privacy', title: 'Privacy' },
  ];
  const outline = buildHandbookOutline(pages, {
    content: 'Content',
    style: 'Style',
  });
  assert.deepEqual(
    outline.map(({ title, children }) => [title, children?.length || 0]),
    [
      ['About', 0],
      ['Content', 2],
      ['Style', 1],
      ['Privacy', 0],
    ],
  );
});

function mockContent(ids, links) {
  return {
    querySelectorAll(selector) {
      if (selector === '[id]') return ids;
      if (selector === 'a[href]') return links;
      return [];
    },
  };
}

test('handbook links target namespaced chapters inside the output', () => {
  const targetId = { id: 'details' };
  const internal = {
    href: 'https://qr.example/guides/content/email.html#details',
    setAttribute(name, value) {
      this[name] = value;
    },
  };
  const external = {
    href: 'https://example.com/',
    setAttribute(name, value) {
      this[name] = value;
    },
  };
  const pages = [
    {
      route: 'content/text',
      url: new URL('https://qr.example/guides/content/text.html'),
      content: mockContent([], [internal, external]),
    },
    {
      route: 'content/email',
      url: new URL('https://qr.example/guides/content/email.html'),
      content: mockContent([targetId], []),
    },
  ];
  prepareHandbookPages(pages, (page) => `${page.route}.xhtml`);
  const chapter = getChapterId('content/email');
  assert.equal(targetId.id, `${chapter}-details`);
  assert.equal(internal.href, `content/email.xhtml#${chapter}-details`);
  assert.equal(external.href, 'https://example.com/');
});

test('PDF export prints semantic HTML instead of page images', async () => {
  const source = await readFile('src/js/info/handbook/handbook-pdf.js', 'utf8');
  assert.doesNotMatch(source, /createElement\(['"]canvas['"]\)/);
  assert.doesNotMatch(source, /capturePdfFrame|createPdfSheetBlob|JPEG/);
  assert.match(source, /contentWindow/);
  assert.match(source, /\.print\(\)/);
});

test('handbook exports include publication front matter', async () => {
  const [pdf, epub, frontMatter, build, progressStyles, setup, footerActions] =
    await Promise.all([
      readFile('src/js/info/handbook/handbook-pdf.js', 'utf8'),
      readFile('src/js/info/handbook/epub.js', 'utf8'),
      readFile('src/js/info/handbook/front-matter.js', 'utf8'),
      readFile('scripts/build.mjs', 'utf8'),
      readFile('src/css/components/task-progress.css', 'utf8'),
      readFile('src/js/info/handbook/handbook-setup.js', 'utf8'),
      readFile('src/js/info/footer-actions.js', 'utf8'),
    ]);
  assert.match(pdf, /createFrontMatter/);
  assert.match(epub, /createEpubDocuments/);
  assert.match(epub, /createCoverPng/);
  assert.doesNotMatch(epub, /createImageBitmap/);
  assert.match(epub, /EPUB\/assets\/cover\.png/);
  const epubDocuments = await readFile(
    'src/js/info/handbook/epub-documents.js',
    'utf8',
  );
  assert.match(epubDocuments, /properties="cover-image"/);
  assert.match(epubDocuments, /name="cover" content="cover-image"/);
  assert.match(epubDocuments, /epub:type="cover"/);
  const pages = await readFile('src/js/info/handbook/pages.js', 'utf8');
  assert.match(pages, /MAP_WATER_COLOR/);
  assert.match(pages, /context\.fillRect/);
  assert.match(pages, /image\.className = canvas\.className/);
  assert.match(pages, /MAP_SAMPLE_EXPORT_SIZE/);
  assert.match(pages, /replaceMapSamples/);
  assert.match(frontMatter, /Lewis Moten III/);
  assert.match(frontMatter, /createDivision/);
  assert.match(build, /site-metadata\.json/);
  assert.match(build, /publishedAt/);
  assert.match(progressStyles, /task-progress-card\[hidden\]/);
  assert.match(setup, /handbook-action-label/);
  assert.match(setup, /action\(copy\.action/);
  assert.match(setup, /navigation\.append\(controls\)/);
  assert.match(footerActions, /generator: '\\u\{25A6\}'/);
  assert.match(footerActions, /guides: '\\u\{1F9ED\}'/);
});
