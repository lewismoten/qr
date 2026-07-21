import { throwIfAborted, waitFor } from '../../app/abort.js';
import {
  buildHandbookOutline,
  prepareHandbookPages,
} from './document-model.js';
import { getHandbookCopy } from './copy.js';
import { loadHandbookPages } from './pages.js';

const LOAD_PROGRESS_WEIGHT = 0.9;
const COMPOSE_PROGRESS = 0.95;
const PRINT_FRAME_LIFETIME_MS = 60_000;

const PRINT_CSS = `
@page { size: letter; margin: 0.65in; }
html { color: #172033; font: 11pt/1.5 Georgia, serif; }
body { margin: 0; }
a { color: #075985; text-decoration: underline; }
h1, h2, h3, h4 { font-family: Arial, sans-serif; break-after: avoid; }
img, svg { max-width: 100%; height: auto; break-inside: avoid; }
pre, code { font-family: monospace; white-space: pre-wrap; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 0.25rem; border: 1px solid #94a3b8; }
button, input, select, textarea, dialog, footer, nav:not(.handbook-toc) {
  display: none !important;
}
.handbook-title { margin-bottom: 0.2in; }
.handbook-toc ol { margin: 0.15rem 0; padding-inline-start: 1.4rem; }
.handbook-toc > ol { padding-inline-start: 1.1rem; }
.handbook-toc li { margin: 0.12rem 0; }
.handbook-toc-group { font-weight: 700; }
.handbook-chapter { break-before: page; }
.handbook-chapter > h1 { margin-top: 0; }
`;

function appendOutline(document, parent, nodes) {
  const list = document.createElement('ol');
  nodes.forEach((node) => {
    const item = document.createElement('li');
    if (node.page) {
      const link = document.createElement('a');
      link.href = `#${node.page.chapterId}`;
      link.textContent = node.title;
      item.append(link);
    } else {
      const label = document.createElement('span');
      label.className = 'handbook-toc-group';
      label.textContent = node.title;
      item.append(label);
      appendOutline(document, item, node.children);
    }
    list.append(item);
  });
  parent.append(list);
}

function appendContents(document, body, pages, copy) {
  const title = document.createElement('h1');
  title.className = 'handbook-title';
  title.textContent = copy.title;
  const navigation = document.createElement('nav');
  navigation.className = 'handbook-toc';
  navigation.setAttribute('aria-label', copy.contents);
  const heading = document.createElement('h2');
  heading.textContent = copy.contents;
  navigation.append(heading);
  appendOutline(
    document,
    navigation,
    buildHandbookOutline(pages, copy.sections),
  );
  body.append(title, navigation);
}

function appendChapters(document, body, pages) {
  pages.forEach((page) => {
    const chapter = document.createElement('section');
    chapter.className = 'handbook-chapter';
    chapter.id = page.chapterId;
    const heading = document.createElement('h1');
    heading.textContent = page.title;
    const content = document.importNode(page.content, true);
    const originalHeading = content.querySelector('h1, h2');
    if (originalHeading?.textContent.trim() === page.title) {
      originalHeading.remove();
    }
    chapter.append(heading, content);
    body.append(chapter);
  });
}

function createPrintFrame(locale, pages, copy) {
  const frame = document.createElement('iframe');
  frame.title = copy.title;
  frame.setAttribute('aria-hidden', 'true');
  Object.assign(frame.style, {
    position: 'fixed',
    inset: 'auto 0 0 auto',
    width: '1px',
    height: '1px',
    border: '0',
    opacity: '0',
    pointerEvents: 'none',
  });
  document.body.append(frame);
  const printDocument = frame.contentDocument;
  printDocument.documentElement.lang = locale;
  printDocument.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
  const metadata = printDocument.createElement('meta');
  metadata.charset = 'utf-8';
  const title = printDocument.createElement('title');
  title.textContent = copy.title;
  const style = printDocument.createElement('style');
  style.textContent = PRINT_CSS;
  printDocument.head.replaceChildren(metadata, title, style);
  printDocument.body.replaceChildren();
  appendContents(printDocument, printDocument.body, pages, copy);
  appendChapters(printDocument, printDocument.body, pages);
  return frame;
}

async function settlePrintFrame(frame, signal) {
  const printDocument = frame.contentDocument;
  await Promise.all(
    [...printDocument.images].map((image) => {
      if (image.complete) return Promise.resolve();
      return image.decode?.().catch(() => {}) || Promise.resolve();
    }),
  );
  await printDocument.fonts?.ready;
  throwIfAborted(signal);
  await waitFor(0, signal);
}

function printAndScheduleRemoval(frame) {
  const printWindow = frame.contentWindow;
  if (!printWindow) throw new Error('The print frame is unavailable.');
  let removed = false;
  const remove = () => {
    if (removed) return;
    removed = true;
    frame.remove();
  };
  printWindow.addEventListener('afterprint', remove, { once: true });
  setTimeout(remove, PRINT_FRAME_LIFETIME_MS);
  printWindow.focus();
  printWindow.print();
}

export async function prepareHandbookPdfPrint(
  locale,
  { signal, onProgress = () => {} } = {},
) {
  const copy = getHandbookCopy(locale);
  const pages = await loadHandbookPages(locale, undefined, {
    signal,
    onProgress: (fraction) => onProgress(fraction * LOAD_PROGRESS_WEIGHT),
  });
  throwIfAborted(signal);
  prepareHandbookPages(pages);
  const frame = createPrintFrame(locale, pages, copy);
  onProgress(COMPOSE_PROGRESS);
  try {
    await settlePrintFrame(frame, signal);
  } catch (error) {
    frame.remove();
    throw error;
  }
  onProgress(1);
  return () => printAndScheduleRemoval(frame);
}
