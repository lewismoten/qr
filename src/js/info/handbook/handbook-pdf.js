import { throwIfAborted, waitFor } from '../../app/abort.js';
import { COLOR_WHITE } from '../../app/colors.js';
import { capturePdfFrame, createPdfSheetBlob } from '../../app/export/pdf.js';
import { HANDBOOK_TEXT_COLOR } from './handbook-styles.js';
import { getHandbookCopy } from './copy.js';
import { loadHandbookPages } from './pages.js';

const PAGE_WIDTH_PIXELS = 816;
const PAGE_HEIGHT_PIXELS = 1056;
const PAGE_MARGIN_PIXELS = 58;
const BODY_FONT_PIXELS = 16;
const BODY_LINE_HEIGHT_PIXELS = 24;
const HEADING_FONT_PIXELS = 24;
const HEADING_LINE_HEIGHT_PIXELS = 32;
const CHAPTER_FONT_PIXELS = 30;
const CHAPTER_LINE_HEIGHT_PIXELS = 40;
const BLOCK_GAP_PIXELS = 10;
const MAXIMUM_VISUAL_HEIGHT_PIXELS = 420;
const PRINT_WIDTH_INCHES = 7.5;
const JPEG_QUALITY = 0.78;
const LOAD_PROGRESS_WEIGHT = 0.6;
const RENDER_PROGRESS_WEIGHT = 0.25;
const CAPTURE_PROGRESS_WEIGHT = 0.15;
const YIELD_BLOCK_INTERVAL = 20;
const BLOCK_SELECTOR = 'h1,h2,h3,h4,p,li,pre,figcaption,dt,dd,th,td,img,svg';

function createPage(document, locale) {
  const canvas = document.createElement('canvas');
  canvas.width = PAGE_WIDTH_PIXELS;
  canvas.height = PAGE_HEIGHT_PIXELS;
  const context = canvas.getContext('2d');
  context.fillStyle = COLOR_WHITE;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = HANDBOOK_TEXT_COLOR;
  context.textBaseline = 'top';
  context.direction = locale === 'ar' ? 'rtl' : 'ltr';
  context.textAlign = locale === 'ar' ? 'right' : 'left';
  return { canvas, context, y: PAGE_MARGIN_PIXELS };
}

function textSegments(text, locale) {
  if (globalThis.Intl?.Segmenter) {
    const segmenter = new Intl.Segmenter(locale, { granularity: 'word' });
    return [...segmenter.segment(text)].map(({ segment }) => segment);
  }
  return /\s/.test(text) ? text.split(/(\s+)/) : [...text];
}

function wrapText(context, text, width, locale) {
  const lines = [];
  let line = '';
  for (const segment of textSegments(text, locale)) {
    const candidate = line + segment;
    if (line && context.measureText(candidate).width > width) {
      lines.push(line.trim());
      line = segment.trimStart();
    } else {
      line = candidate;
    }
  }
  if (line.trim()) lines.push(line.trim());
  return lines.length ? lines : [''];
}

function blockStyle(element) {
  if (element.matches('h1')) {
    return {
      font: `700 ${CHAPTER_FONT_PIXELS}px Georgia, serif`,
      lineHeight: CHAPTER_LINE_HEIGHT_PIXELS,
    };
  }
  if (element.matches('h2, h3, h4')) {
    return {
      font: `700 ${HEADING_FONT_PIXELS}px Georgia, serif`,
      lineHeight: HEADING_LINE_HEIGHT_PIXELS,
    };
  }
  if (element.matches('pre')) {
    return {
      font: `${BODY_FONT_PIXELS - 2}px monospace`,
      lineHeight: BODY_LINE_HEIGHT_PIXELS,
    };
  }
  return {
    font: `${BODY_FONT_PIXELS}px Georgia, serif`,
    lineHeight: BODY_LINE_HEIGHT_PIXELS,
  };
}

function readableBlocks(page) {
  return [...page.content.querySelectorAll(BLOCK_SELECTOR)].filter(
    (element) => {
      if (element.querySelector(BLOCK_SELECTOR)) return false;
      if (element.matches('img, svg')) return true;
      return element.textContent.trim();
    },
  );
}

function visualSource(element) {
  if (element.matches('img')) {
    return element.src.startsWith('data:') ? element.src : null;
  }
  const source = new XMLSerializer().serializeToString(element);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`;
}

function loadVisual(element, signal) {
  const source = visualSource(element);
  if (!source) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    throwIfAborted(signal);
    const image = new Image();
    const cleanup = () => signal?.removeEventListener('abort', cancel);
    const cancel = () => {
      cleanup();
      try {
        throwIfAborted(signal);
      } catch (error) {
        reject(error);
      }
    };
    image.addEventListener(
      'load',
      () => {
        cleanup();
        resolve(image);
      },
      { once: true },
    );
    image.addEventListener(
      'error',
      () => {
        cleanup();
        resolve(null);
      },
      { once: true },
    );
    signal?.addEventListener('abort', cancel, { once: true });
    image.src = source;
  });
}

async function drawVisual(page, element, locale, signal, output) {
  const image = await loadVisual(element, signal);
  if (!image || !image.naturalWidth || !image.naturalHeight) return page;
  const maximumWidth = PAGE_WIDTH_PIXELS - PAGE_MARGIN_PIXELS * 2;
  const scale = Math.min(
    maximumWidth / image.naturalWidth,
    MAXIMUM_VISUAL_HEIGHT_PIXELS / image.naturalHeight,
    1,
  );
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  if (needsPage(page, height)) {
    page = createPage(document, locale);
    output.push(page.canvas);
  }
  const x =
    locale === 'ar'
      ? PAGE_WIDTH_PIXELS - PAGE_MARGIN_PIXELS - width
      : PAGE_MARGIN_PIXELS;
  page.context.drawImage(image, x, page.y, width, height);
  page.y += height + BLOCK_GAP_PIXELS;
  return page;
}

function drawLine(page, line, lineHeight, locale) {
  const x =
    locale === 'ar'
      ? PAGE_WIDTH_PIXELS - PAGE_MARGIN_PIXELS
      : PAGE_MARGIN_PIXELS;
  page.context.fillText(line, x, page.y);
  page.y += lineHeight;
}

function needsPage(page, lineHeight) {
  return page.y + lineHeight > PAGE_HEIGHT_PIXELS - PAGE_MARGIN_PIXELS;
}

function drawWrappedText(page, text, style, locale, output) {
  page.context.font = style.font;
  const width = PAGE_WIDTH_PIXELS - PAGE_MARGIN_PIXELS * 2;
  for (const line of wrapText(page.context, text, width, locale)) {
    if (needsPage(page, style.lineHeight)) {
      page = createPage(document, locale);
      page.context.font = style.font;
      output.push(page.canvas);
    }
    drawLine(page, line, style.lineHeight, locale);
  }
  page.y += BLOCK_GAP_PIXELS;
  return page;
}

function renderContents(pages, locale, output) {
  const copy = getHandbookCopy(locale);
  let page = createPage(document, locale);
  output.push(page.canvas);
  page = drawWrappedText(
    page,
    copy.title,
    {
      font: `700 ${CHAPTER_FONT_PIXELS}px Georgia, serif`,
      lineHeight: CHAPTER_LINE_HEIGHT_PIXELS,
    },
    locale,
    output,
  );
  page = drawWrappedText(
    page,
    copy.contents,
    {
      font: `700 ${HEADING_FONT_PIXELS}px Georgia, serif`,
      lineHeight: HEADING_LINE_HEIGHT_PIXELS,
    },
    locale,
    output,
  );
  pages.forEach((chapter, index) => {
    page = drawWrappedText(
      page,
      `${index + 1}. ${chapter.title}`,
      {
        font: `${BODY_FONT_PIXELS}px Georgia, serif`,
        lineHeight: BODY_LINE_HEIGHT_PIXELS,
      },
      locale,
      output,
    );
  });
}

async function renderPages(pages, locale, signal, onProgress) {
  const output = [];
  renderContents(pages, locale, output);
  let current = createPage(document, locale);
  output.push(current.canvas);
  const totalBlocks = pages.reduce(
    (total, page) => total + readableBlocks(page).length + 1,
    0,
  );
  let completedBlocks = 0;

  for (const chapter of pages) {
    const heading = document.createElement('h1');
    heading.textContent = chapter.title;
    const blocks = [heading, ...readableBlocks(chapter)];
    for (const block of blocks) {
      throwIfAborted(signal);
      if (block.matches('img, svg')) {
        current = await drawVisual(current, block, locale, signal, output);
        completedBlocks += 1;
        onProgress(completedBlocks / totalBlocks);
        continue;
      }
      const style = blockStyle(block);
      const text = block.textContent.replace(/\s+/g, ' ').trim();
      current = drawWrappedText(current, text, style, locale, output);
      completedBlocks += 1;
      onProgress(completedBlocks / totalBlocks);
      if (completedBlocks % YIELD_BLOCK_INTERVAL === 0) {
        await waitFor(0, signal);
      }
    }
  }
  return output;
}

export async function createHandbookPdf(
  locale,
  { signal, onProgress = () => {} } = {},
) {
  const pages = await loadHandbookPages(locale, undefined, {
    signal,
    onProgress: (fraction) => onProgress(fraction * LOAD_PROGRESS_WEIGHT),
  });
  const canvases = await renderPages(pages, locale, signal, (fraction) => {
    onProgress(LOAD_PROGRESS_WEIGHT + fraction * RENDER_PROGRESS_WEIGHT);
  });
  const frames = [];
  for (const [index, canvas] of canvases.entries()) {
    throwIfAborted(signal);
    frames.push(
      await capturePdfFrame(canvas, JPEG_QUALITY, PRINT_WIDTH_INCHES),
    );
    onProgress(
      LOAD_PROGRESS_WEIGHT +
        RENDER_PROGRESS_WEIGHT +
        ((index + 1) / canvases.length) * CAPTURE_PROGRESS_WEIGHT,
    );
    await waitFor(0, signal);
  }
  throwIfAborted(signal);
  return createPdfSheetBlob(frames);
}
