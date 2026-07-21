import { getGuideOutputPath, GUIDE_ROUTES } from '../../i18n/guide-routes.js';

export const HANDBOOK_ROUTES = Object.freeze([
  'about',
  'technology',
  ...GUIDE_ROUTES.filter((route) => {
    return !['index', 'about', 'privacy', 'spec', 'technology'].includes(route);
  }),
  'spec',
  'privacy',
]);

function normalizeResources(container, pageUrl) {
  container.querySelectorAll('[href], [src]').forEach((element) => {
    for (const attribute of ['href', 'src']) {
      const value = element.getAttribute(attribute);
      if (!value || value.startsWith('#')) continue;
      try {
        element.setAttribute(attribute, new URL(value, pageUrl).href);
      } catch {
        // Keep malformed authoring visible instead of aborting an export.
      }
    }
  });
}

function dataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(reader.result));
    reader.addEventListener('error', () => reject(reader.error));
    reader.readAsDataURL(blob);
  });
}

async function inlineImages(container) {
  await Promise.all(
    [...container.querySelectorAll('img[src]')].map(async (image) => {
      if (image.src.startsWith('data:')) return;
      try {
        const response = await fetch(image.src);
        if (response.ok) image.src = await dataUrl(await response.blob());
      } catch {
        // Preserve the absolute source if an optional image cannot be captured.
      }
    }),
  );
}

const PAGE_RENDER_TIMEOUT_MS = 15_000;
const PAGE_SETTLE_DELAY_MS = 300;

function renderedDocument(url) {
  return new Promise((resolve, reject) => {
    const frame = document.createElement('iframe');
    const timer = setTimeout(() => {
      frame.remove();
      reject(new Error(`Timed out while rendering ${url.pathname}.`));
    }, PAGE_RENDER_TIMEOUT_MS);
    frame.hidden = true;
    frame.setAttribute('aria-hidden', 'true');
    frame.addEventListener('load', () => {
      clearTimeout(timer);
      setTimeout(
        () => resolve({ document: frame.contentDocument, frame }),
        PAGE_SETTLE_DELAY_MS,
      );
    });
    frame.src = `${url.href}${url.search ? '&' : '?'}handbook-source=1`;
    document.body.append(frame);
  });
}

async function extractPage(document, url, route) {
  const content =
    document.querySelector('.info-dialog-content') ||
    document.querySelector('main') ||
    document.body;
  const clone = content.cloneNode(true);
  const canvases = [...content.querySelectorAll('canvas')];
  [...clone.querySelectorAll('canvas')].forEach((canvas, index) => {
    try {
      const image = document.createElement('img');
      image.src = canvases[index].toDataURL('image/png');
      image.alt = canvases[index].getAttribute('aria-label') || '';
      canvas.replaceWith(image);
    } catch {
      canvas.remove();
    }
  });
  clone.querySelectorAll('script, footer, .spec-footer').forEach((item) => {
    item.remove();
  });
  clone.querySelectorAll('[hidden]').forEach((item) => {
    item.removeAttribute('hidden');
  });
  normalizeResources(clone, url);
  await inlineImages(clone);
  const heading = clone.querySelector('h1, h2');
  return {
    route,
    title: heading?.textContent.trim() || document.title || route,
    url,
    content: clone,
  };
}

export async function loadHandbookPages(locale, root = new URL('/', location)) {
  const pages = [];
  for (const route of HANDBOOK_ROUTES) {
    const url = new URL(getGuideOutputPath(route, locale), root);
    const rendered = await renderedDocument(url);
    try {
      pages.push(await extractPage(rendered.document, url, route));
    } finally {
      rendered.frame.remove();
    }
  }
  return pages;
}
