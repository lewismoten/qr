import { createZipBlob } from '../../app/export/zip.js';
import { getHandbookCopy } from './copy.js';
import { loadHandbookPages } from './pages.js';

const XHTML_TYPE = 'application/xhtml+xml';

function textBlob(value, type = 'text/plain') {
  return new Blob([value], { type });
}

function escapeXml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function serializeContent(content) {
  return [...content.childNodes]
    .map((node) => new XMLSerializer().serializeToString(node))
    .join('');
}

function dataImage(source) {
  const match = /^data:([^;,]+);base64,(.+)$/.exec(source);
  if (!match) return null;
  const binary = atob(match[2]);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return { type: match[1], bytes };
}

function imageExtension(type) {
  return {
    'image/gif': 'gif',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/svg+xml': 'svg',
    'image/webp': 'webp',
  }[type];
}

function extractImages(pages) {
  const assets = [];
  for (const page of pages) {
    for (const image of page.content.querySelectorAll('img[src^="data:"]')) {
      const decoded = dataImage(image.src);
      const extension = decoded && imageExtension(decoded.type);
      if (!extension) continue;
      const name = `image-${assets.length + 1}.${extension}`;
      image.src = `assets/${name}`;
      assets.push({ name, ...decoded });
    }
  }
  return assets;
}

function chapterXhtml(page, index, locale) {
  const direction = locale === 'ar' ? 'rtl' : 'ltr';
  const title = escapeXml(page.title);
  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    `<html xmlns="http://www.w3.org/1999/xhtml" lang="${locale}" ` +
    `dir="${direction}"><head><title>${title}</title>` +
    '<link rel="stylesheet" href="styles.css" /></head><body>' +
    `<section id="chapter-${index + 1}"><h1>${title}</h1>` +
    `${serializeContent(page.content)}</section></body></html>`
  );
}

function navigation(pages, locale, copy) {
  const items = pages.map((page, index) => {
    return (
      `<li><a href="chapter-${index + 1}.xhtml">` +
      `${escapeXml(page.title)}</a></li>`
    );
  });
  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    `<html xmlns="http://www.w3.org/1999/xhtml" lang="${locale}">` +
    `<head><title>${escapeXml(copy.contents)}</title></head><body>` +
    '<nav epub:type="toc" xmlns:epub="http://www.idpf.org/2007/ops">' +
    `<h1>${escapeXml(copy.contents)}</h1><ol>` +
    `${items.join('')}</ol></nav></body></html>`
  );
}

function packageDocument(pages, locale, identifier, copy) {
  const modified = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  const manifest = pages.map((page, index) => {
    return (
      `<item id="chapter-${index + 1}" ` +
      `href="chapter-${index + 1}.xhtml" media-type="${XHTML_TYPE}"/>`
    );
  });
  const spine = pages.map((page, index) => {
    return `<itemref idref="chapter-${index + 1}"/>`;
  });
  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<package xmlns="http://www.idpf.org/2007/opf" version="3.0" ' +
    `unique-identifier="book-id" xml:lang="${locale}"><metadata ` +
    'xmlns:dc="http://purl.org/dc/elements/1.1/">' +
    `<dc:identifier id="book-id">${identifier}</dc:identifier>` +
    `<dc:title>${escapeXml(copy.title)}</dc:title>` +
    `<dc:language>${locale}</dc:language>` +
    `<meta property="dcterms:modified">${modified}</meta>` +
    '</metadata><manifest><item id="nav" href="nav.xhtml" ' +
    `media-type="${XHTML_TYPE}" properties="nav"/>` +
    '<item id="styles" href="styles.css" media-type="text/css"/>' +
    `${manifest.join('')}</manifest><spine>${spine.join('')}</spine></package>`
  );
}

function imageManifest(assets) {
  return assets
    .map((asset, index) => {
      return (
        `<item id="image-${index + 1}" href="assets/${asset.name}" ` +
        `media-type="${asset.type}"/>`
      );
    })
    .join('');
}

const CONTAINER =
  '<?xml version="1.0" encoding="UTF-8"?>' +
  '<container version="1.0" ' +
  'xmlns="urn:oasis:names:tc:opendocument:xmlns:container">' +
  '<rootfiles><rootfile full-path="EPUB/package.opf" ' +
  'media-type="application/oebps-package+xml"/></rootfiles></container>';

const EPUB_CSS = `
body { color: #172033; font: 1rem/1.55 serif; }
h1, h2, h3 { font-family: sans-serif; }
img, svg { max-width: 100%; height: auto; }
button, input, select, textarea, dialog, nav { display: none; }
`;

export async function createHandbookEpub(locale) {
  const copy = getHandbookCopy(locale);
  const pages = await loadHandbookPages(locale);
  const assets = extractImages(pages);
  const identifier = `urn:uuid:${crypto.randomUUID()}`;
  const files = [
    { name: 'mimetype', blob: textBlob('application/epub+zip') },
    { name: 'META-INF/container.xml', blob: textBlob(CONTAINER, 'text/xml') },
    {
      name: 'EPUB/package.opf',
      blob: textBlob(
        packageDocument(pages, locale, identifier, copy).replace(
          '</manifest>',
          `${imageManifest(assets)}</manifest>`,
        ),
        'text/xml',
      ),
    },
    {
      name: 'EPUB/nav.xhtml',
      blob: textBlob(navigation(pages, locale, copy), XHTML_TYPE),
    },
    { name: 'EPUB/styles.css', blob: textBlob(EPUB_CSS, 'text/css') },
    ...pages.map((page, index) => ({
      name: `EPUB/chapter-${index + 1}.xhtml`,
      blob: textBlob(chapterXhtml(page, index, locale), XHTML_TYPE),
    })),
    ...assets.map((asset) => ({
      name: `EPUB/assets/${asset.name}`,
      blob: new Blob([asset.bytes], { type: asset.type }),
    })),
  ];
  const zip = await createZipBlob(files);
  return new Blob([await zip.arrayBuffer()], {
    type: 'application/epub+zip',
  });
}
