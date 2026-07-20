import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { ensurePanelFragment } from '../../src/js/app/ui/fragment-loader.js';

function createElement(tagName) {
  return {
    tagName,
    attributes: new Map(),
    children: [],
    listeners: new Map(),
    append(...children) {
      this.children.push(...children);
    },
    setAttribute(name, value) {
      this.attributes.set(name, value);
    },
    removeAttribute(name) {
      this.attributes.delete(name);
    },
    addEventListener(name, listener) {
      this.listeners.set(name, listener);
    },
    querySelector(selector) {
      if (selector !== 'h2') return null;
      return this.children
        .flatMap((child) => child.children ?? [])
        .find((child) => child.tagName === 'h2');
    },
    showModal() {
      this.open = true;
    },
    close() {
      this.open = false;
    },
  };
}

function createEnvironment() {
  const document = {
    baseURI: 'https://qr.test/index.html',
    defaultView: {},
    documentElement: {
      lang: '',
      dir: '',
      classList: { toggle() {} },
    },
    querySelectorAll: () => [],
    createElement,
    importNode: (node) => node,
  };
  const link = createElement('a');
  const panel = {
    ownerDocument: document,
    dataset: { fragmentUrl: 'guides/content/frame.html' },
    children: [],
    querySelector: () => link,
    setAttribute() {},
    removeAttribute() {},
    replaceChildren(...children) {
      this.children = children;
    },
    append(...children) {
      this.children.push(...children);
    },
    dispatchEvent() {},
  };
  return { document, link, panel };
}

describe('fragment help', () => {
  test('preserves the href and opens imported help in a dialog', async () => {
    const { document, link, panel } = createEnvironment();
    let initializedContent = null;
    const source = createElement('section');
    source.children.push(createElement('h2'));
    const parsed = {
      querySelector: () => ({ childNodes: [{ id: 'frame-mode' }] }),
      querySelectorAll: () => [source],
    };
    await ensurePanelFragment(panel, {
      document,
      fetcher: async () => ({ ok: true, text: async () => '' }),
      parse: () => parsed,
      initializeHelp: (content) => {
        initializedContent = content;
      },
    });
    const dialog = panel.children.at(-1);
    assert.equal(panel.children.at(-2), link);
    assert.equal(dialog.tagName, 'dialog');
    assert.match(dialog.attributes.get('aria-labelledby'), /^fragment-help-/);

    let prevented = false;
    link.listeners.get('click')({
      preventDefault() {
        prevented = true;
      },
    });
    assert.equal(prevented, true);
    assert.equal(dialog.open, true);
    assert.equal(initializedContent, dialog.children[0]);
    dialog.children[1].listeners.get('click')();
    assert.equal(dialog.open, false);
  });

  test('retains the standalone link when loading fails', async () => {
    const { document, link, panel } = createEnvironment();
    await assert.rejects(
      ensurePanelFragment(panel, {
        document,
        fetcher: async () => ({ ok: false, status: 500 }),
      }),
      /500/,
    );
    assert.equal(panel.children[1], link);
  });
});
