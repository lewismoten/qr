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

export function getHandbookPublicUrl(value, base) {
  const url = new URL(value, base);
  if (LOCAL_HOSTS.has(url.hostname)) {
    const publicOrigin = new URL(PUBLIC_SITE_ORIGIN);
    url.protocol = publicOrigin.protocol;
    url.hostname = publicOrigin.hostname;
    url.port = publicOrigin.port;
  }
  return url;
}

export function normalizeHandbookResources(container, pageUrl) {
  container.querySelectorAll('[href], [src]').forEach((element) => {
    for (const attribute of ['href', 'src']) {
      const value = element.getAttribute(attribute);
      if (!value || value.startsWith('#')) continue;
      try {
        const resolved =
          attribute === 'href'
            ? getHandbookPublicUrl(value, pageUrl)
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

export async function inlineHandbookImages(container, signal) {
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
const MAP_CANVAS_CLASS = 'slippy-map-vector-tile';
const MAP_WATER_COLOR = '#bfe3ed';
const MAP_SAMPLE_EXPORT_SIZE = 512;

export function getHandbookCanvasSource(canvas) {
  if (!canvas.classList.contains(MAP_CANVAS_CLASS)) {
    return canvas.toDataURL('image/png');
  }
  const flattened = document.createElement('canvas');
  flattened.width = canvas.width;
  flattened.height = canvas.height;
  const context = flattened.getContext('2d');
  context.fillStyle = MAP_WATER_COLOR;
  context.fillRect(0, 0, flattened.width, flattened.height);
  context.drawImage(canvas, 0, 0);
  return flattened.toDataURL('image/png');
}

export function replaceHandbookCanvas(canvas, source) {
  const image = document.createElement('img');
  image.src = source;
  image.alt = canvas.getAttribute('aria-label') || '';
  image.className = canvas.className;
  image.setAttribute('width', String(canvas.width));
  image.setAttribute('height', String(canvas.height));
  canvas.replaceWith(image);
}

function tileOffset(tile, property) {
  return (
    (Number.parseFloat(tile.style[property]) / 100) * MAP_SAMPLE_EXPORT_SIZE
  );
}

export function getHandbookMapSampleSource(mosaic) {
  const output = document.createElement('canvas');
  output.width = MAP_SAMPLE_EXPORT_SIZE;
  output.height = MAP_SAMPLE_EXPORT_SIZE;
  const context = output.getContext('2d');
  context.fillStyle = MAP_WATER_COLOR;
  context.fillRect(0, 0, output.width, output.height);
  for (const tile of mosaic.querySelectorAll('.slippy-map-tile')) {
    const canvas = tile.querySelector(`canvas.${MAP_CANVAS_CLASS}`);
    if (!canvas) continue;
    context.drawImage(
      canvas,
      tileOffset(tile, 'left'),
      tileOffset(tile, 'top'),
      MAP_SAMPLE_EXPORT_SIZE,
      MAP_SAMPLE_EXPORT_SIZE,
    );
  }
  return output.toDataURL('image/png');
}

export function replaceHandbookMapSamples(content, clone) {
  const sources = [...content.querySelectorAll('.geo-layer-sample-mosaic')];
  const targets = [...clone.querySelectorAll('.geo-layer-sample-mosaic')];
  targets.forEach((mosaic, index) => {
    const image = document.createElement('img');
    image.className = 'geo-layer-sample-composite';
    image.alt = '';
    image.width = MAP_SAMPLE_EXPORT_SIZE;
    image.height = MAP_SAMPLE_EXPORT_SIZE;
    image.src = getHandbookMapSampleSource(sources[index]);
    mosaic.replaceChildren(image);
  });
}

export function renderHandbookDocument(
  url,
  signal,
  {
    timeoutMs = PAGE_RENDER_TIMEOUT_MS,
    settleDelayMs = PAGE_SETTLE_DELAY_MS,
  } = {},
) {
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
    }, timeoutMs);
    frame.hidden = true;
    frame.setAttribute('aria-hidden', 'true');
    frame.addEventListener('load', async () => {
      try {
        await frame.contentWindow.handbookPageReady;
        cleanup();
        setTimeout(
          () => resolve({ document: frame.contentDocument, frame }),
          settleDelayMs,
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

export async function extractHandbookPage(document, url, route, signal) {
  const content =
    document.querySelector('.info-dialog-content') ||
    document.querySelector('main') ||
    document.body;
  const clone = content.cloneNode(true);
  replaceHandbookMapSamples(content, clone);
  const canvases = [...content.querySelectorAll('canvas')].filter(
    (canvas) => !canvas.closest('.geo-layer-sample-mosaic'),
  );
  [...clone.querySelectorAll('canvas')].forEach((canvas, index) => {
    try {
      replaceHandbookCanvas(canvas, getHandbookCanvasSource(canvases[index]));
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
  normalizeHandbookResources(clone, url);
  await inlineHandbookImages(clone, signal);
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
  {
    signal,
    onProgress = () => {},
    render = renderHandbookDocument,
    extract = extractHandbookPage,
  } = {},
) {
  const pages = [];
  for (const [index, route] of HANDBOOK_ROUTES.entries()) {
    throwIfAborted(signal);
    const url = new URL(getGuideOutputPath(route, locale), root);
    const rendered = await render(url, signal);
    try {
      pages.push(await extract(rendered.document, url, route, signal));
    } finally {
      rendered.frame.remove();
    }
    onProgress((index + 1) / HANDBOOK_ROUTES.length, route);
    await waitFor(0, signal);
  }
  return pages;
}
