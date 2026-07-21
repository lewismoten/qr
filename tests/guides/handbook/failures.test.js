import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  extractHandbookPage,
  inlineHandbookImages,
  renderHandbookDocument,
} from '../../../src/js/info/handbook/pages.js';

test('preserves failed image requests and reports FileReader errors', async () => {
  const originalReader = globalThis.FileReader;
  const originalFetch = globalThis.fetch;
  const image = { src: 'https://example.com/image.png' };
  globalThis.fetch = async () => {
    throw new Error('offline');
  };
  try {
    await inlineHandbookImages({ querySelectorAll: () => [image] });
    assert.equal(image.src, 'https://example.com/image.png');

    globalThis.fetch = async () => ({
      ok: true,
      blob: async () => new Blob([new Uint8Array([1])]),
    });
    globalThis.FileReader = class extends EventTarget {
      readAsDataURL() {
        this.error = new Error('decode failed');
        this.dispatchEvent(new Event('error'));
      }
    };
    await inlineHandbookImages({ querySelectorAll: () => [image] });
    assert.equal(image.src, 'https://example.com/image.png');
  } finally {
    globalThis.FileReader = originalReader;
    globalThis.fetch = originalFetch;
  }
});

function iframeDocument({ ready = Promise.resolve(), load = true } = {}) {
  let onLoad;
  let removed = 0;
  const frame = {
    contentWindow: { handbookPageReady: ready },
    setAttribute() {},
    addEventListener(_name, handler) {
      onLoad = handler;
    },
    remove() {
      removed += 1;
    },
  };
  return {
    document: {
      body: { append: () => load && onLoad() },
      createElement: () => frame,
    },
    frame,
    removed: () => removed,
  };
}

test('cleans up rejected and aborted handbook iframes', async () => {
  const originalDocument = globalThis.document;
  const rejected = iframeDocument({ ready: Promise.reject(new Error('bad')) });
  globalThis.document = rejected.document;
  try {
    await assert.rejects(
      () => renderHandbookDocument(new URL('https://qr.test/page')),
      /bad/,
    );
    assert.equal(rejected.removed(), 1);

    const waiting = iframeDocument({ load: false });
    globalThis.document = waiting.document;
    const controller = new AbortController();
    const request = renderHandbookDocument(
      new URL('https://qr.test/waiting'),
      controller.signal,
    );
    controller.abort();
    await assert.rejects(request, /aborted/i);
    assert.equal(waiting.removed(), 1);
  } finally {
    globalThis.document = originalDocument;
  }
});

test('drops canvases that cannot be captured during extraction', async () => {
  let removed = 0;
  const sourceCanvas = {
    classList: { contains: () => false },
    toDataURL() {
      throw new Error('tainted');
    },
    closest: () => null,
  };
  const targetCanvas = { remove: () => (removed += 1) };
  const clone = {
    querySelector: () => null,
    querySelectorAll(selector) {
      if (selector === 'canvas') return [targetCanvas];
      return [];
    },
  };
  const content = {
    cloneNode: () => clone,
    querySelectorAll(selector) {
      if (selector === 'canvas') return [sourceCanvas];
      return [];
    },
  };
  const document = {
    body: content,
    title: 'Canvas fallback',
    querySelector: () => null,
  };
  const page = await extractHandbookPage(
    document,
    new URL('https://qr.test/page'),
    'page',
  );
  assert.equal(removed, 1);
  assert.equal(page.title, 'Canvas fallback');
});
