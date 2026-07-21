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

function mockElement({ id = '', tagName = 'DIV', text = '', attributes = {} }) {
  const values = new Map(Object.entries(attributes));
  const children = [];
  const element = {
    id,
    tagName,
    textContent: text,
    children,
    get attributes() {
      return [...values].map(([name, value]) => ({ name, value }));
    },
    get href() {
      return values.get('href');
    },
    classList: { add: (value) => values.set('class', value) },
    matches: (selector) => selector === 'a[href]' && values.has('href'),
    setAttribute: (name, value) => values.set(name, value),
    removeAttribute: (name) => values.delete(name),
    querySelector: (selector) =>
      selector.includes('indicator') ? children[0] || null : null,
    querySelectorAll: (selector) =>
      selector.includes('indicator') ? children : [],
    append: (child) => children.push(child),
    value: (name) => values.get(name),
  };
  return element;
}

function richContent({ ids = [], links = [], headings = [], elements = [] }) {
  const ownerDocument = {
    createElement: (tagName) => mockElement({ tagName: tagName.toUpperCase() }),
  };
  links.forEach((link) => (link.ownerDocument = ownerDocument));
  return {
    ownerDocument,
    querySelectorAll(selector) {
      if (selector === '[id]')
        return [...ids, ...headings.filter(({ id }) => id)];
      if (selector === 'a[href]') return links;
      if (selector === 'h2, h3') return headings;
      if (selector === '*') return [...ids, ...links, ...elements];
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

test('handbook preparation rewrites identifiers, references, and links', () => {
  const field = mockElement({ id: 'field' });
  const reference = mockElement({
    attributes: {
      'aria-labelledby': 'field missing',
      style: 'clip-path: url(#field)',
      title: '#field',
    },
  });
  const heading = mockElement({ tagName: 'H3', text: 'Details' });
  const internal = mockElement({
    tagName: 'A',
    attributes: {
      href: 'http://127.0.0.1/guides/content/email.html#field',
      rel: 'external',
      target: '_blank',
    },
  });
  let removedIndicators = 0;
  internal.children.push({ remove: () => (removedIndicators += 1) });
  const malformedFragment = mockElement({
    tagName: 'A',
    attributes: { href: 'http://localhost/guides/content/email.html#%E0%A4%A' },
  });
  const external = mockElement({
    tagName: 'A',
    attributes: { href: 'https://example.com/' },
  });
  const malformed = mockElement({
    tagName: 'A',
    attributes: { href: 'http://[' },
  });
  const pages = [
    {
      route: 'content/text',
      title: 'Text',
      url: new URL('http://localhost/guides/content/text.html'),
      content: richContent({
        links: [internal, malformedFragment, external, malformed],
      }),
    },
    {
      route: 'content/email',
      title: 'Email',
      url: new URL('http://localhost/guides/content/email.html'),
      content: richContent({
        ids: [field],
        headings: [heading],
        elements: [reference],
      }),
    },
  ];
  prepareHandbookPages(pages, (page) => `${page.route}.xhtml`);
  const chapter = getChapterId('content/email');
  assert.equal(field.id, `${chapter}-field`);
  assert.equal(heading.id, `${chapter}-section-1`);
  assert.equal(reference.value('aria-labelledby'), `${chapter}-field missing`);
  assert.equal(reference.value('style'), `clip-path: url(#${chapter}-field)`);
  assert.equal(reference.value('title'), `#${chapter}-field`);
  assert.equal(internal.href, `content/email.xhtml#${chapter}-field`);
  assert.equal(internal.value('target'), undefined);
  assert.equal(internal.value('rel'), undefined);
  assert.equal(removedIndicators, 1);
  assert.equal(malformedFragment.href, `content/email.xhtml#${chapter}`);
  assert.equal(external.value('class'), 'handbook-external-link');
  assert.equal(external.children[0].textContent, '\u2197');
  assert.equal(malformed.href, 'http://[');
  internal.setAttribute('href', 'http://localhost/guides/content/email.html');
  prepareHandbookPages(pages);
  assert.match(internal.href, /^#handbook-chapter-content-email/);
});

test('handbook outlines include nested headings and ungrouped third levels', () => {
  const headings = [
    mockElement({ tagName: 'H3', id: 'orphan', text: 'Orphan' }),
    mockElement({ tagName: 'H2', id: 'parent', text: 'Parent' }),
    mockElement({ tagName: 'H3', id: 'child', text: 'Child' }),
  ];
  const [outline] = buildHandbookOutline([
    {
      route: 'about',
      title: 'About',
      content: richContent({ headings }),
    },
  ]);
  assert.deepEqual(outline.children, [
    { title: 'Orphan', href: '#orphan', children: [] },
    {
      title: 'Parent',
      href: '#parent',
      children: [{ title: 'Child', href: '#child', children: [] }],
    },
  ]);
  assert.equal(
    getChapterId('Style/Pixel Art!'),
    'handbook-chapter-Style-Pixel-Art-',
  );
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
  assert.match(pages, /replaceHandbookMapSamples/);
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
