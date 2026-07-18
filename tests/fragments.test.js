import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, test } from 'node:test';
import { ensurePanelFragment } from '../src/js/app/ui/fragment-loader.js';
import {
  activateNavigationHash,
  readNavigationHash,
} from '../src/js/app/ui/navigation/location.js';

function createEnvironment() {
  const imported = [];
  const document = {
    baseURI: 'https://qr.test/index.html',
    defaultView: {},
    documentElement: {
      lang: '',
      dir: '',
      classList: { toggle() {} },
    },
    querySelectorAll: () => [],
    importNode(node) {
      imported.push(node);
      return node;
    },
    createElement() {
      return { className: '', textContent: '' };
    },
  };
  const panel = {
    ownerDocument: document,
    dataset: { fragmentUrl: 'fragments/style/modules.html' },
    attributes: new Map(),
    children: [],
    setAttribute(name, value) {
      this.attributes.set(name, value);
    },
    removeAttribute(name) {
      this.attributes.delete(name);
    },
    replaceChildren(...children) {
      this.children = children;
    },
    dispatchEvent() {},
  };
  return { document, imported, panel };
}

describe('application fragments', () => {
  test('loads, imports, translates, and deduplicates a panel', async () => {
    const { document, imported, panel } = createEnvironment();
    let fetches = 0;
    const fetcher = async (url) => {
      fetches += 1;
      assert.equal(url.href, 'https://qr.test/fragments/style/modules.html');
      return { ok: true, text: async () => '<html></html>' };
    };
    const node = { id: 'module-shape' };
    const parse = () => ({
      querySelector: () => ({ childNodes: [node] }),
    });
    const first = ensurePanelFragment(panel, {
      document,
      fetcher,
      parse,
    });
    const second = ensurePanelFragment(panel, {
      document,
      fetcher,
      parse,
    });
    assert.equal(first, second);
    assert.equal(await first, panel);
    assert.deepEqual(imported, [node]);
    assert.deepEqual(panel.children, [node]);
    assert.equal(panel.dataset.fragmentLoaded, 'true');
    assert.equal(panel.attributes.has('aria-busy'), false);
    assert.equal(fetches, 1);
    assert.equal(await ensurePanelFragment(panel), panel);
    assert.equal(await ensurePanelFragment(null), null);
  });

  test('reports failed responses and permits a retry', async () => {
    const { document, panel } = createEnvironment();
    let status = 503;
    const fetcher = async () => ({
      ok: status === 200,
      status,
      text: async () => '<html></html>',
    });
    await assert.rejects(
      ensurePanelFragment(panel, {
        document,
        fetcher,
        parse: () => ({ querySelector: () => null }),
      }),
      /503/,
    );
    assert.match(panel.children[0].textContent, /Unable to load/);
    status = 200;
    await assert.rejects(
      ensurePanelFragment(panel, {
        document,
        fetcher,
        parse: () => ({ querySelector: () => null }),
      }),
      /missing/,
    );
  });

  test('uses the document parser and rejects unavailable fetch', async () => {
    const { document, panel } = createEnvironment();
    document.defaultView.DOMParser = class {
      parseFromString() {
        return { querySelector: () => ({ childNodes: [] }) };
      }
    };
    document.defaultView.fetch = async () => ({
      ok: true,
      text: async () => '',
    });
    await ensurePanelFragment(panel);

    const unavailable = createEnvironment();
    await assert.rejects(
      ensurePanelFragment(unavailable.panel, {
        document: unavailable.document,
        fetcher: null,
        parse: () => null,
      }),
      /Fetch is unavailable/,
    );

    const fallback = createEnvironment();
    const OriginalParser = globalThis.DOMParser;
    globalThis.DOMParser = document.defaultView.DOMParser;
    fallback.document.defaultView.fetch = document.defaultView.fetch;
    try {
      await ensurePanelFragment(fallback.panel);
    } finally {
      globalThis.DOMParser = OriginalParser;
    }
  });

  test('keeps standalone pages and app placeholders in sync', async () => {
    const index = await readFile(new URL('../index.html', import.meta.url), {
      encoding: 'utf8',
    });
    const definitions = [
      ['content/frame', 'tab=content&amp;subtab=frame'],
      ['style/modules', 'tab=style&amp;subtab=modules'],
      ['style/colors', 'tab=style&amp;subtab=colors'],
      ['style/artwork', 'tab=style&amp;subtab=artwork'],
    ];
    for (const [path, hash] of definitions) {
      const relative = 'fragments/' + path + '.html';
      assert.match(index, new RegExp('data-fragment-url="' + relative + '"'));
      const page = await readFile(new URL('../' + relative, import.meta.url), {
        encoding: 'utf8',
      });
      assert.match(page, /<header[\s>]/);
      assert.match(page, /<footer[\s>]/);
      assert.match(page, /data-app-fragment=/);
      const appPosition = page.indexOf('data-app-fragment=');
      const helpPositions = [...page.matchAll(/data-fragment-help>/g)].map(
        (match) => match.index,
      );
      assert.equal(helpPositions.length, 2);
      assert.ok(helpPositions[0] < appPosition);
      assert.ok(helpPositions[1] > appPosition);
      assert.match(page, new RegExp(hash));
      assert.match(page, /rel="canonical"/);
      assert.match(
        index,
        new RegExp(
          'href="' + relative + '"[\\s\\S]{0,120}' + 'data-fragment-help-link',
        ),
      );
    }
    assert.doesNotMatch(index, /id="module-shape"/);
    assert.doesNotMatch(index, /id="color-dark"/);
    assert.doesNotMatch(index, /id="center-art-mode"/);
    assert.doesNotMatch(index, /id="frame-message-mode"/);
  });
});

describe('fragment hash navigation', () => {
  test('parses valid targets and rejects unrelated hashes', () => {
    assert.deepEqual(readNavigationHash('#tab=style&subtab=colors'), {
      tab: 'style',
      subtab: 'colors',
    });
    assert.deepEqual(readNavigationHash('tab=debug&subtab=unknown'), {
      tab: 'debug',
      subtab: 'encoding',
    });
    assert.equal(readNavigationHash('#about-dialog'), null);
    assert.equal(readNavigationHash('#tab=unknown'), null);
  });

  test('activates every supported tab family', async () => {
    const calls = [];
    const navigation = {
      activateTab: async (value) => calls.push(['tab', value]),
      activateContent: async (value) => calls.push(['content', value]),
      activateStyle: async (value) => calls.push(['style', value]),
      activateDownload: async (value) => calls.push(['download', value]),
      activateDebug: async (value) => calls.push(['debug', value]),
    };
    for (const target of [
      'tab=content&subtab=frame',
      'tab=style&subtab=modules',
      'tab=download&subtab=document',
      'tab=debug&subtab=overlay',
    ]) {
      assert.equal(await activateNavigationHash(navigation, target), true);
    }
    assert.equal(
      await activateNavigationHash(navigation, '#privacy-dialog'),
      false,
    );
    assert.deepEqual(calls, [
      ['tab', 'content'],
      ['content', 'frame'],
      ['tab', 'style'],
      ['style', 'modules'],
      ['tab', 'download'],
      ['download', 'document'],
      ['tab', 'debug'],
      ['debug', 'overlay'],
    ]);
  });
});
