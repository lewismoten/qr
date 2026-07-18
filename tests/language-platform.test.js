import assert from 'node:assert/strict';
import { test } from 'node:test';
import { initializeLanguage } from '../src/js/i18n/index.js';
import { setupLanguagePicker } from '../src/js/i18n/picker.js';

class Element extends EventTarget {
  children = [];
  attributes = new Map();
  classList = {
    add() {},
    remove() {},
    toggle() {},
  };
  hidden = false;
  textContent = '';

  append(...children) {
    this.children.push(...children);
  }

  appendChild(child) {
    this.append(child);
  }

  replaceChildren(...children) {
    this.children = [...children];
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  querySelector() {
    return null;
  }

  contains(target) {
    return target === this;
  }

  focus() {}
}

class Document extends EventTarget {
  constructor() {
    super();
    this.elements = new Map(
      [
        'language-picker',
        'language-picker-trigger',
        'language-picker-panel',
        'language-picker-grid',
      ].map((id) => [id, new Element()]),
    );
    this.baseURI = 'https://example.test/';
    this.documentElement = {
      classList: { toggle() {} },
      dir: '',
      lang: '',
    };
  }

  getElementById(id) {
    return this.elements.get(id);
  }

  createElement() {
    return new Element();
  }

  querySelectorAll() {
    return [];
  }
}

const baseUrl = new URL('https://example.test/locales/');
const fetcher = async (url) => {
  const name = new URL(url).pathname.split('/').pop();
  const resources = {
    'manifest.json': { defaultLocale: 'en-US', locales: ['en-US', 'es'] },
    'en-US.json': {},
    'es.json': {},
  };
  const value = resources[name];
  return {
    ok: value !== undefined,
    status: value === undefined ? 404 : 200,
    json: async () => value,
  };
};

test('language names survive incomplete Intl display-name support', async () => {
  await initializeLanguage({ locale: 'en-US', baseUrl, fetcher });
  const OriginalDisplayNames = Intl.DisplayNames;
  const implementations = [
    class {
      of() {
        return '';
      }
    },
    class {
      constructor() {
        throw new Error('Display names unavailable');
      }
    },
  ];

  try {
    for (const DisplayNames of implementations) {
      Intl.DisplayNames = DisplayNames;
      const document = new Document();
      setupLanguagePicker({ document, languages: ['en-US'] });
      assert.match(
        document
          .getElementById('language-picker-trigger')
          .getAttribute('aria-label'),
        /en-US/,
      );
    }
  } finally {
    Intl.DisplayNames = OriginalDisplayNames;
  }
});

test('default language change callback reloads and translates', async () => {
  await initializeLanguage({ locale: 'en-US', baseUrl, fetcher });
  const document = new Document();
  const previous = {
    document: globalThis.document,
    fetch: globalThis.fetch,
    requestAnimationFrame: globalThis.requestAnimationFrame,
  };
  const storageDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    'localStorage',
  );
  globalThis.document = document;
  globalThis.fetch = fetcher;
  globalThis.requestAnimationFrame = (callback) => callback();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { setItem() {} },
  });
  try {
    setupLanguagePicker({ document, languages: ['en-US'] });
    document
      .getElementById('language-picker-grid')
      .children.find(({ lang }) => lang === 'es')
      .dispatchEvent(new Event('click'));
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(document.documentElement.lang, 'es');
  } finally {
    globalThis.document = previous.document;
    globalThis.fetch = previous.fetch;
    globalThis.requestAnimationFrame = previous.requestAnimationFrame;
    if (storageDescriptor)
      Object.defineProperty(globalThis, 'localStorage', storageDescriptor);
    else delete globalThis.localStorage;
  }
});
