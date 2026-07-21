import { createZipBlob } from '../../app/export/zip.js';
import { throwIfAborted } from '../../app/abort.js';
import {
  MEDIA_TYPE_CSS,
  MEDIA_TYPE_EPUB,
  MEDIA_TYPE_EPUB_PACKAGE,
  MEDIA_TYPE_PLAIN_TEXT,
  MEDIA_TYPE_PNG,
  MEDIA_TYPE_SVG,
  MEDIA_TYPE_TEXT_XML,
  MEDIA_TYPE_XHTML,
} from '../../app/media-types.js';
import { getHandbookCopy } from './copy.js';
import { prepareHandbookPages } from './document-model.js';
import {
  createEpubDocuments,
  EPUB_CSS,
  navigation,
  packageDocument,
} from './epub-documents.js';
import {
  createCoverImage,
  HANDBOOK_COVER_HEIGHT,
  HANDBOOK_COVER_WIDTH,
  loadHandbookEncoder,
  loadHandbookMetadata,
} from './front-matter.js';
import { loadHandbookPages } from './pages.js';

const PAGE_LOADING_PROGRESS_WEIGHT = 0.7;
const ARCHIVE_PROGRESS_WEIGHT = 1 - PAGE_LOADING_PROGRESS_WEIGHT;

function textBlob(value, type = MEDIA_TYPE_PLAIN_TEXT) {
  return new Blob([value], { type });
}

function canvasBlob(canvas, type) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Unable to render the EPUB cover image.'));
    }, type);
  });
}

function loadImage(image, url, signal) {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      image.removeEventListener('load', done);
      image.removeEventListener('error', failed);
      signal?.removeEventListener('abort', canceled);
    };
    const done = () => {
      cleanup();
      resolve();
    };
    const failed = () => {
      cleanup();
      reject(new Error('Unable to decode the EPUB cover artwork.'));
    };
    const canceled = () => {
      cleanup();
      try {
        throwIfAborted(signal);
      } catch (error) {
        reject(error);
      }
    };
    image.addEventListener('load', done);
    image.addEventListener('error', failed);
    signal?.addEventListener('abort', canceled, { once: true });
    image.src = url;
  });
}

async function createCoverPng(svg, signal) {
  const source = textBlob(svg, MEDIA_TYPE_SVG);
  const url = URL.createObjectURL(source);
  const image = document.createElement('img');
  try {
    await loadImage(image, url, signal);
    throwIfAborted(signal);
    const canvas = document.createElement('canvas');
    canvas.width = HANDBOOK_COVER_WIDTH;
    canvas.height = HANDBOOK_COVER_HEIGHT;
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0, HANDBOOK_COVER_WIDTH, HANDBOOK_COVER_HEIGHT);
    return await canvasBlob(canvas, MEDIA_TYPE_PNG);
  } finally {
    URL.revokeObjectURL(url);
  }
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

function extractImages(pages, signal) {
  const assets = [];
  for (const page of pages) {
    for (const image of page.content.querySelectorAll('img[src^="data:"]')) {
      throwIfAborted(signal);
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
  `media-type="${MEDIA_TYPE_EPUB_PACKAGE}"/></rootfiles></container>`;

export async function createHandbookEpub(
  locale,
  { signal, onProgress = () => {} } = {},
) {
  const copy = getHandbookCopy(locale);
  const [metadata, qrEncoder] = await Promise.all([
    loadHandbookMetadata(locale, signal),
    loadHandbookEncoder(),
  ]);
  const pages = await loadHandbookPages(locale, undefined, {
    signal,
    onProgress: (fraction) => {
      onProgress(fraction * PAGE_LOADING_PROGRESS_WEIGHT);
    },
  });
  throwIfAborted(signal);
  const chapterNames = new Map(
    pages.map((page, index) => [page, `chapter-${index + 1}.xhtml`]),
  );
  prepareHandbookPages(pages, (page) => chapterNames.get(page));
  const assets = extractImages(pages, signal);
  const documents = createEpubDocuments(
    pages,
    locale,
    copy,
    metadata,
    qrEncoder,
  );
  const coverSvg = createCoverImage(document, copy, metadata, qrEncoder);
  const coverPng = await createCoverPng(coverSvg, signal);
  throwIfAborted(signal);
  const identifier = `urn:uuid:${crypto.randomUUID()}`;
  const files = [
    { name: 'mimetype', blob: textBlob(MEDIA_TYPE_EPUB) },
    {
      name: 'META-INF/container.xml',
      blob: textBlob(CONTAINER, MEDIA_TYPE_TEXT_XML),
    },
    {
      name: 'EPUB/package.opf',
      blob: textBlob(
        packageDocument(documents, locale, identifier, copy, metadata).replace(
          '</manifest>',
          `${imageManifest(assets)}</manifest>`,
        ),
        MEDIA_TYPE_TEXT_XML,
      ),
    },
    {
      name: 'EPUB/nav.xhtml',
      blob: textBlob(
        navigation(pages, locale, copy, chapterNames),
        MEDIA_TYPE_XHTML,
      ),
    },
    { name: 'EPUB/styles.css', blob: textBlob(EPUB_CSS, MEDIA_TYPE_CSS) },
    {
      name: 'EPUB/assets/cover.png',
      blob: coverPng,
    },
    ...documents.map((bookDocument) => ({
      name: `EPUB/${bookDocument.name}`,
      blob: textBlob(bookDocument.content, MEDIA_TYPE_XHTML),
    })),
    ...assets.map((asset) => ({
      name: `EPUB/assets/${asset.name}`,
      blob: new Blob([asset.bytes], { type: asset.type }),
    })),
  ];
  const zip = await createZipBlob(files, {
    signal,
    onProgress: (completed, total) => {
      onProgress(
        PAGE_LOADING_PROGRESS_WEIGHT +
          (completed / total) * ARCHIVE_PROGRESS_WEIGHT,
      );
    },
  });
  throwIfAborted(signal);
  return new Blob([await zip.arrayBuffer()], {
    type: MEDIA_TYPE_EPUB,
  });
}
