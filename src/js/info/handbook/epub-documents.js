import {
  MEDIA_TYPE_CSS,
  MEDIA_TYPE_SVG,
  MEDIA_TYPE_XHTML,
} from '../../app/media-types.js';
import { buildHandbookOutline } from './document-model.js';
import { createDivision, createFrontMatter } from './front-matter.js';
import { HANDBOOK_DOCUMENT_CSS } from './handbook-styles.js';

export const EPUB_CSS = `
${HANDBOOK_DOCUMENT_CSS}
body { padding: 0.4rem; }
.handbook-cover, .handbook-title-page, .handbook-preface,
.handbook-division { min-height: 90vh; }
.unit-example-grid, .visual-grid, .reference-links, .implementation-links,
.mixed-example-layout { display: block; }
.unit-example, .visual-card, .reference-links a { margin-bottom: 0.65rem; }
.unit-stream { display: block; }
.unit-stream > span { margin-bottom: 0.18rem; display: block; }
.mixed-mode-stream { display: block; }
.mixed-segment { margin-bottom: 0.4rem; display: block; break-inside: avoid; }
.mask-formula-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.geo-layer-table, .geo-layer-table tbody { width: 100%; display: block; }
.geo-layer-table thead { display: none; }
.geo-layer-table tr {
  margin-bottom: 0.7rem; padding: 0.45rem; display: block;
  border: 1px solid #94a3b8; border-radius: 0.4rem;
  break-inside: avoid !important; page-break-inside: avoid !important;
  -webkit-column-break-inside: avoid;
}
.geo-layer-table td { padding: 0.2rem; display: block; border: 0; }
.geo-layer-table td:first-child {
  color: var(--book-teal); font: 700 1rem/1.2 sans-serif;
}
.geo-layer-table .geo-layer-sample { margin: 0.35rem auto 0; }
`;

const escapeXml = (value) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');

function serializeContent(content) {
  return [...content.childNodes]
    .map((node) => new XMLSerializer().serializeToString(node))
    .join('');
}

function xhtml(title, content, locale) {
  const direction = locale === 'ar' ? 'rtl' : 'ltr';
  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    `<html xmlns="http://www.w3.org/1999/xhtml" lang="${locale}" ` +
    `dir="${direction}"><head><title>${escapeXml(title)}</title>` +
    '<link rel="stylesheet" href="styles.css" /></head><body>' +
    `${content}</body></html>`
  );
}

function chapterXhtml(page, locale) {
  return xhtml(
    page.title,
    `<section class="handbook-chapter" id="${page.chapterId}">` +
      `<h1>${escapeXml(page.title)}</h1>` +
      `${serializeContent(page.content)}</section>`,
    locale,
  );
}

function navigationItems(nodes, chapterNames, parentName = '') {
  const items = nodes.map((node) => {
    if (node.page) {
      const name = chapterNames.get(node.page);
      return (
        `<li><a href="${name}#${node.page.chapterId}">` +
        `${escapeXml(node.title)}</a>` +
        `${navigationItems(node.children || [], chapterNames, name)}</li>`
      );
    }
    if (node.href) {
      return (
        `<li><a href="${parentName}${node.href}">` +
        `${escapeXml(node.title)}</a>` +
        `${navigationItems(node.children || [], chapterNames, parentName)}` +
        '</li>'
      );
    }
    return (
      `<li><span>${escapeXml(node.title)}</span>` +
      `${navigationItems(node.children, chapterNames, parentName)}</li>`
    );
  });
  return `<ol>${items.join('')}</ol>`;
}

export function navigation(pages, locale, copy, chapterNames) {
  const items = navigationItems(
    buildHandbookOutline(pages, copy.sections),
    chapterNames,
  );
  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    `<html xmlns="http://www.w3.org/1999/xhtml" lang="${locale}">` +
    `<head><title>${escapeXml(copy.contents)}</title>` +
    '<link rel="stylesheet" href="styles.css" /></head><body>' +
    '<nav class="handbook-toc" epub:type="toc" ' +
    'xmlns:epub="http://www.idpf.org/2007/ops">' +
    `<h1>${escapeXml(copy.contents)}</h1>${items}</nav></body></html>`
  );
}

export function packageDocument(documents, locale, identifier, copy, metadata) {
  const modified = metadata.publishedAt.replace(/\.\d{3}Z$/, 'Z');
  const manifest = documents.map((item) => {
    return (
      `<item id="${item.id}" href="${item.name}" ` +
      `media-type="${MEDIA_TYPE_XHTML}"${item.properties || ''}/>`
    );
  });
  const spine = documents.map((item) => `<itemref idref="${item.id}"/>`);
  spine.splice(Math.min(3, spine.length), 0, '<itemref idref="nav"/>');
  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<package xmlns="http://www.idpf.org/2007/opf" version="3.0" ' +
    `unique-identifier="book-id" xml:lang="${locale}"><metadata ` +
    'xmlns:dc="http://purl.org/dc/elements/1.1/">' +
    `<dc:identifier id="book-id">${identifier}</dc:identifier>` +
    `<dc:title>${escapeXml(copy.title)}</dc:title>` +
    `<dc:creator>${escapeXml(metadata.author)}</dc:creator>` +
    `<dc:date>${modified}</dc:date><dc:language>${locale}</dc:language>` +
    `<meta property="dcterms:modified">${modified}</meta></metadata>` +
    '<manifest><item id="nav" href="nav.xhtml" ' +
    `media-type="${MEDIA_TYPE_XHTML}" properties="nav"/>` +
    '<item id="cover-image" href="assets/cover.svg" ' +
    `media-type="${MEDIA_TYPE_SVG}" properties="cover-image"/>` +
    `<item id="styles" href="styles.css" media-type="${MEDIA_TYPE_CSS}"/>` +
    `${manifest.join('')}</manifest><spine>${spine.join('')}</spine></package>`
  );
}

function divisionFor(page) {
  if (page.route === 'about') return 'about';
  if (page.route === 'spec') return 'spec';
  if (page.route === 'technology') return 'technology';
  if (page.route === 'privacy') return 'privacy';
  return 'guides';
}

export function createEpubDocuments(pages, locale, copy, metadata, qrEncoder) {
  const front = createFrontMatter(document, copy, metadata, qrEncoder);
  const documents = [
    {
      id: 'cover',
      name: 'cover.xhtml',
      content: xhtml(copy.title, front.cover.outerHTML, locale),
      properties: ' properties="svg"',
    },
    {
      id: 'title-page',
      name: 'title.xhtml',
      content: xhtml(copy.title, front.title.outerHTML, locale),
    },
    {
      id: 'preface',
      name: 'preface.xhtml',
      content: xhtml(copy.prefaceTitle, front.preface.outerHTML, locale),
    },
  ];
  let previousDivision;
  let divisionIndex = 0;
  pages.forEach((page, index) => {
    const division = divisionFor(page);
    if (division !== previousDivision) {
      divisionIndex += 1;
      const divider = createDivision(
        document,
        copy.divisions[division],
        divisionIndex,
      );
      documents.push({
        id: `division-${division}`,
        name: `division-${division}.xhtml`,
        content: xhtml(copy.divisions[division], divider.outerHTML, locale),
      });
      previousDivision = division;
    }
    documents.push({
      id: `chapter-${index + 1}`,
      name: `chapter-${index + 1}.xhtml`,
      content: chapterXhtml(page, locale),
    });
  });
  return documents;
}
