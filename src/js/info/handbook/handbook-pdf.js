import { throwIfAborted, waitFor } from '../../app/abort.js';
import {
  buildHandbookOutline,
  prepareHandbookPages,
} from './document-model.js';
import { getHandbookCopy } from './copy.js';
import {
  createDivision,
  createFrontMatter,
  HANDBOOK_AUTHOR,
  loadHandbookEncoder,
  loadHandbookMetadata,
} from './front-matter.js';
import { HANDBOOK_DOCUMENT_CSS } from './handbook-styles.js';
import { loadHandbookPages } from './pages.js';

const LOAD_PROGRESS_WEIGHT = 0.9;
const COMPOSE_PROGRESS = 0.95;
const PRINT_FRAME_LIFETIME_MS = 60_000;

const PRINT_CSS = `
@page { size: letter; margin: 0.65in; }
${HANDBOOK_DOCUMENT_CSS}
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
      if (node.children?.length) appendOutline(document, item, node.children);
    } else if (node.href) {
      const link = document.createElement('a');
      link.href = node.href;
      link.textContent = node.title;
      item.append(link);
      if (node.children?.length) appendOutline(document, item, node.children);
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

function divisionFor(page) {
  if (page.route === 'about') return 'about';
  if (page.route === 'spec') return 'spec';
  if (page.route === 'technology') return 'technology';
  if (page.route === 'privacy') return 'privacy';
  return 'guides';
}

function appendChapters(document, body, pages, copy) {
  let previousDivision;
  let divisionIndex = 0;
  pages.forEach((page) => {
    const division = divisionFor(page);
    if (division !== previousDivision) {
      divisionIndex += 1;
      body.append(
        createDivision(document, copy.divisions[division], divisionIndex),
      );
      previousDivision = division;
    }
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

function createPrintFrame(locale, pages, copy, handbookMetadata, qrEncoder) {
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
  const author = printDocument.createElement('meta');
  author.name = 'author';
  author.content = HANDBOOK_AUTHOR;
  const title = printDocument.createElement('title');
  title.textContent = copy.title;
  const style = printDocument.createElement('style');
  style.textContent = PRINT_CSS;
  printDocument.head.replaceChildren(metadata, author, title, style);
  printDocument.body.replaceChildren();
  const frontMatter = createFrontMatter(
    printDocument,
    copy,
    handbookMetadata,
    qrEncoder,
  );
  printDocument.body.append(
    frontMatter.cover,
    frontMatter.title,
    frontMatter.preface,
  );
  appendContents(printDocument, printDocument.body, pages, copy);
  appendChapters(printDocument, printDocument.body, pages, copy);
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
  const [handbookMetadata, qrEncoder] = await Promise.all([
    loadHandbookMetadata(locale, signal),
    loadHandbookEncoder(),
  ]);
  const pages = await loadHandbookPages(locale, undefined, {
    signal,
    onProgress: (fraction) => onProgress(fraction * LOAD_PROGRESS_WEIGHT),
  });
  throwIfAborted(signal);
  prepareHandbookPages(pages);
  const frame = createPrintFrame(
    locale,
    pages,
    copy,
    handbookMetadata,
    qrEncoder,
  );
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
