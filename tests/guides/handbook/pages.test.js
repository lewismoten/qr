import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  extractHandbookPage,
  getHandbookCanvasSource,
  getHandbookMapSampleSource,
  getHandbookPublicUrl,
  HANDBOOK_ROUTES,
  inlineHandbookImages,
  loadHandbookPages,
  normalizeHandbookResources,
  renderHandbookDocument,
  replaceHandbookCanvas,
  replaceHandbookMapSamples,
} from '../../../src/js/info/handbook/pages.js';

test('normalizes local handbook links and resource URLs', () => {
  assert.equal(
    getHandbookPublicUrl('/guides/', 'http://localhost/page').href,
    'https://qr.lewismoten.com/guides/',
  );
  assert.equal(
    getHandbookPublicUrl('/guide', 'https://example.com/page').href,
    'https://example.com/guide',
  );
  const values = new Map([
    ['href', '/about.html'],
    ['src', './image.svg'],
  ]);
  const element = {
    getAttribute: (name) => values.get(name),
    setAttribute: (name, value) => values.set(name, value),
  };
  const malformed = {
    getAttribute: () => 'http://[invalid',
    setAttribute() {
      throw new Error('should not set malformed URLs');
    },
  };
  const skipped = [null, '#chapter'].map((value) => ({
    getAttribute: () => value,
    setAttribute() {
      throw new Error('should skip empty and fragment-only values');
    },
  }));
  normalizeHandbookResources(
    { querySelectorAll: () => [element, malformed, ...skipped] },
    new URL('http://127.0.0.1:8080/guides/page.html'),
  );
  assert.equal(values.get('href'), 'https://qr.lewismoten.com/about.html');
  assert.equal(values.get('src'), 'http://127.0.0.1:8080/guides/image.svg');
});

test('inlines available handbook images and preserves failures', async () => {
  const originalReader = globalThis.FileReader;
  const originalFetch = globalThis.fetch;
  class Reader extends EventTarget {
    readAsDataURL() {
      this.result = 'data:image/png;base64,AQ==';
      this.dispatchEvent(new Event('load'));
    }
  }
  const images = [
    { src: 'data:image/png;base64,AA==' },
    { src: 'https://example.com/ok.png' },
    { src: 'https://example.com/missing.png' },
  ];
  globalThis.FileReader = Reader;
  globalThis.fetch = async (url) => ({
    ok: url.endsWith('ok.png'),
    blob: async () => new Blob([new Uint8Array([1])]),
  });
  try {
    await inlineHandbookImages({ querySelectorAll: () => images });
    assert.equal(images[1].src, 'data:image/png;base64,AQ==');
    assert.equal(images[2].src, 'https://example.com/missing.png');
  } finally {
    globalThis.FileReader = originalReader;
    globalThis.fetch = originalFetch;
  }
});

test('converts canvases and map mosaics into image sources', () => {
  const originalDocument = globalThis.document;
  const drawCalls = [];
  const context = {
    fillRect: (...values) => drawCalls.push(['fillRect', ...values]),
    drawImage: (...values) => drawCalls.push(['drawImage', ...values]),
  };
  globalThis.document = {
    createElement(tag) {
      if (tag === 'canvas') {
        return {
          getContext: () => context,
          toDataURL: () => 'data:flattened',
        };
      }
      return { setAttribute() {} };
    },
  };
  const ordinary = {
    classList: { contains: () => false },
    toDataURL: () => 'data:ordinary',
  };
  const mapCanvas = {
    classList: { contains: () => true },
    width: 256,
    height: 256,
  };
  try {
    assert.equal(getHandbookCanvasSource(ordinary), 'data:ordinary');
    assert.equal(getHandbookCanvasSource(mapCanvas), 'data:flattened');
    const sourceCanvas = {};
    const mosaic = {
      querySelectorAll: () => [
        {
          style: { left: '25%', top: '50%' },
          querySelector: () => sourceCanvas,
        },
        {
          style: { left: '0%', top: '0%' },
          querySelector: () => null,
        },
      ],
    };
    assert.equal(getHandbookMapSampleSource(mosaic), 'data:flattened');
    assert.equal(
      drawCalls.some(
        (call) => call[0] === 'drawImage' && call[1] === sourceCanvas,
      ),
      true,
    );

    let replacement;
    replaceHandbookCanvas(
      {
        className: 'sample',
        width: 10,
        height: 20,
        getAttribute: () => 'Map',
        replaceWith: (value) => {
          replacement = value;
        },
      },
      'data:image',
    );
    assert.equal(replacement.src, 'data:image');
    assert.equal(replacement.alt, 'Map');

    let composite;
    replaceHandbookMapSamples(
      { querySelectorAll: () => [mosaic] },
      {
        querySelectorAll: () => [
          { replaceChildren: (value) => (composite = value) },
        ],
      },
    );
    assert.equal(composite.src, 'data:flattened');
    assert.equal(composite.width, 512);
  } finally {
    globalThis.document = originalDocument;
  }
});

test('extracts and cleans a rendered handbook page', async () => {
  const removed = [];
  const hidden = [{ removeAttribute: (name) => removed.push(name) }];
  const disposable = Array.from({ length: 4 }, () => ({
    remove: () => removed.push('removed'),
  }));
  const number = {
    textContent: '1',
    remove: () => removed.push('number'),
  };
  const title = { prepend: (value) => removed.push(value) };
  const clone = {
    querySelector(selector) {
      if (selector === 'h1, h2') return { textContent: ' Chapter ' };
      return null;
    },
    querySelectorAll(selector) {
      const values = {
        '.geo-layer-sample-mosaic': [],
        canvas: [],
        'script, footer, .spec-footer': disposable.slice(0, 1),
        '[data-handbook-exclude], [data-app-only]': disposable.slice(1, 2),
        'img[data-fallback-src]': disposable.slice(2, 3),
        '.process-list li': [
          {
            querySelector: (value) =>
              value === ':scope > span' ? number : title,
          },
          { querySelector: () => null },
        ],
        '[hidden]': hidden,
        '[href], [src]': [],
        'img[src]': [],
      };
      return values[selector] ?? [];
    },
  };
  const content = {
    cloneNode: () => clone,
    querySelectorAll: () => [],
  };
  const document = {
    title: 'Fallback title',
    querySelector: (selector) =>
      selector === '.info-dialog-content' ? content : null,
  };
  const url = new URL('https://qr.test/about.html');
  const page = await extractHandbookPage(document, url, 'about');
  assert.equal(page.title, 'Chapter');
  assert.equal(page.content, clone);
  assert.equal(removed.includes('1. '), true);
  assert.equal(removed.includes('hidden'), true);
});

test('renders an iframe document and removes it after loading', async () => {
  const originalDocument = globalThis.document;
  let load;
  const frame = {
    contentDocument: { title: 'Rendered' },
    contentWindow: { handbookPageReady: Promise.resolve() },
    setAttribute() {},
    addEventListener(_name, handler) {
      load = handler;
    },
    remove() {},
  };
  globalThis.document = {
    body: {
      append() {
        load();
      },
    },
    createElement: () => frame,
  };
  try {
    const result = await renderHandbookDocument(
      new URL('https://qr.test/about.html'),
    );
    assert.equal(result.document.title, 'Rendered');
    assert.match(frame.src, /handbook-source=1/);
  } finally {
    globalThis.document = originalDocument;
  }
});

test('loads every handbook route with progress and cleanup', async () => {
  const progress = [];
  const removed = [];
  const pages = await loadHandbookPages('en-US', new URL('https://qr.test/'), {
    render: async (url) => ({
      document: { title: url.pathname },
      frame: { remove: () => removed.push(url.pathname) },
    }),
    extract: async (document, url, route) => ({ document, url, route }),
    onProgress: (...values) => progress.push(values),
  });
  assert.equal(pages.length, HANDBOOK_ROUTES.length);
  assert.equal(removed.length, HANDBOOK_ROUTES.length);
  assert.equal(progress.at(-1)[0], 1);
});
