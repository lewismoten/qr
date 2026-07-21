import { getGuideOutputPath, GUIDE_ROUTES } from '../../i18n/guide-routes.js';
import { throwIfAborted, waitFor } from '../../app/abort.js';

export const HANDBOOK_ROUTES = Object.freeze([
  'about',
  ...GUIDE_ROUTES.filter((route) => {
    return !['index', 'about', 'privacy', 'spec', 'technology'].includes(route);
  }),
  'spec',
  'technology',
  'privacy',
]);

const PUBLIC_SITE_ORIGIN = 'https://qr.lewismoten.com';
const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost']);

function publicUrl(value, base) {
  const url = new URL(value, base);
  if (LOCAL_HOSTS.has(url.hostname)) {
    const publicOrigin = new URL(PUBLIC_SITE_ORIGIN);
    url.protocol = publicOrigin.protocol;
    url.host = publicOrigin.host;
  }
  return url;
}

function normalizeResources(container, pageUrl) {
  container.querySelectorAll('[href], [src]').forEach((element) => {
    for (const attribute of ['href', 'src']) {
      const value = element.getAttribute(attribute);
      if (!value || value.startsWith('#')) continue;
      try {
        const resolved =
          attribute === 'href'
            ? publicUrl(value, pageUrl)
            : new URL(value, pageUrl);
        element.setAttribute(attribute, resolved.href);
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

async function inlineImages(container, signal) {
  await Promise.all(
    [...container.querySelectorAll('img[src]')].map(async (image) => {
      throwIfAborted(signal);
      if (image.src.startsWith('data:')) return;
      try {
        const response = await fetch(image.src, { signal });
        if (response.ok) image.src = await dataUrl(await response.blob());
      } catch {
        throwIfAborted(signal);
        // Preserve the absolute source if an optional image cannot be captured.
      }
    }),
  );
}

const PAGE_RENDER_TIMEOUT_MS = 15_000;
const PAGE_SETTLE_DELAY_MS = 50;

function renderedDocument(url, signal) {
  return new Promise((resolve, reject) => {
    throwIfAborted(signal);
    const frame = document.createElement('iframe');
    const cleanup = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', cancel);
    };
    const cancel = () => {
      cleanup();
      frame.remove();
      try {
        throwIfAborted(signal);
      } catch (error) {
        reject(error);
      }
    };
    const timer = setTimeout(() => {
      cleanup();
      frame.remove();
      reject(new Error(`Timed out while rendering ${url.pathname}.`));
    }, PAGE_RENDER_TIMEOUT_MS);
    frame.hidden = true;
    frame.setAttribute('aria-hidden', 'true');
    frame.addEventListener('load', async () => {
      try {
        await frame.contentWindow.handbookPageReady;
        cleanup();
        setTimeout(
          () => resolve({ document: frame.contentDocument, frame }),
          PAGE_SETTLE_DELAY_MS,
        );
      } catch (error) {
        cleanup();
        frame.remove();
        reject(error);
      }
    });
    signal?.addEventListener('abort', cancel, { once: true });
    frame.src = `${url.href}${url.search ? '&' : '?'}handbook-source=1`;
    document.body.append(frame);
  });
}

async function extractPage(document, url, route, signal) {
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
  clone
    .querySelectorAll('[data-handbook-exclude], [data-app-only]')
    .forEach((item) => {
      item.remove();
    });
  clone.querySelectorAll('img[data-fallback-src]').forEach((image) => {
    image.remove();
  });
  clone.querySelectorAll('.process-list li').forEach((item) => {
    const number = item.querySelector(':scope > span');
    const title = item.querySelector('strong');
    if (!number || !title) return;
    title.prepend(`${number.textContent.trim()}. `);
    number.remove();
  });
  clone.querySelectorAll('[hidden]').forEach((item) => {
    item.removeAttribute('hidden');
  });
  normalizeResources(clone, url);
  await inlineImages(clone, signal);
  const heading = clone.querySelector('h1, h2');
  return {
    route,
    title: heading?.textContent.trim() || document.title || route,
    url,
    content: clone,
  };
}

export async function loadHandbookPages(
  locale,
  root = new URL('/', location),
  { signal, onProgress = () => {} } = {},
) {
  const pages = [];
  for (const [index, route] of HANDBOOK_ROUTES.entries()) {
    throwIfAborted(signal);
    const url = new URL(getGuideOutputPath(route, locale), root);
    const rendered = await renderedDocument(url, signal);
    try {
      pages.push(await extractPage(rendered.document, url, route, signal));
    } finally {
      rendered.frame.remove();
    }
    onProgress((index + 1) / HANDBOOK_ROUTES.length, route);
    await waitFor(0, signal);
  }
  return pages;
}
