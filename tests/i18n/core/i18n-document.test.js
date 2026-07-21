import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  initializeLanguage,
  preloadTranslationEntries,
  translateDocument,
} from '../../../src/js/i18n/index.js';

class ClassList {
  names = new Set();

  toggle(name, force) {
    if (force) this.names.add(name);
    else this.names.delete(name);
  }

  contains(name) {
    return this.names.has(name);
  }
}

class Element {
  constructor({ dataset = {}, attributes = {}, value = '' } = {}) {
    this.dataset = { ...dataset };
    this.attributes = new Map(Object.entries(attributes));
    this.textContent = '';
    this.value = value;
    this.defaultValue = value;
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  setAttribute(name, value) {
    this.attributes.set(name, value);
  }
}

function createDocument(elements) {
  return {
    documentElement: {
      lang: '',
      dir: '',
      classList: new ClassList(),
    },
    querySelectorAll(selector) {
      return elements[selector] || [];
    },
  };
}

function createFetcher(resources) {
  return async (url) => {
    const name = new URL(url).pathname.split('/').pop();
    const value = resources[name];
    return {
      ok: value !== undefined,
      status: value === undefined ? 404 : 200,
      json: async () => value,
    };
  };
}

test('document translation applies text, attributes, direction, and values', async () => {
  const text = new Element({ dataset: { i18n: 'screen.title' } });
  text.textContent = 'Fallback title';
  const format = new Element({ dataset: { i18n: 'formats.url' } });
  format.textContent = 'URL';
  const label = new Element({
    attributes: {
      'aria-label': 'Fallback label',
      'data-i18n-aria-label': 'screen.label',
    },
  });
  const placeholder = new Element({
    attributes: {
      placeholder: 'Fallback placeholder',
      'data-i18n-placeholder': 'screen.placeholder',
    },
  });
  const title = new Element({
    attributes: {
      title: 'Fallback tooltip',
      'data-i18n-title': 'screen.tooltip',
    },
  });
  const input = new Element({
    value: 'Default value',
    attributes: {
      value: 'Default value',
      'data-i18n-value': 'screen.value',
    },
  });
  const document = createDocument({
    '[data-i18n]': [text, format],
    '[data-i18n-aria-label]': [label],
    '[data-i18n-placeholder]': [placeholder],
    '[data-i18n-title]': [title],
    '[data-i18n-value]': [input],
  });
  const baseUrl = new URL('https://example.test/locales/');
  const fetcher = createFetcher({
    'manifest.json': {
      defaultLocale: 'en-US',
      locales: ['en-US', 'ar', 'en-XA'],
    },
    'en-US.json': { screen: { title: 'English title' } },
    'ar.json': {
      screen: {
        title: 'عنوان',
        label: 'تسمية',
        placeholder: 'عنصر نائب',
        tooltip: 'تلميح',
        value: 'قيمة',
      },
    },
    'en-XA.json': { $debug: true },
  });

  await initializeLanguage({ locale: 'ar', baseUrl, fetcher });
  translateDocument(document);
  assert.equal(document.documentElement.lang, 'ar');
  assert.equal(document.documentElement.dir, 'rtl');
  assert.equal(text.textContent, 'عنوان');
  assert.equal(format.dataset.i18nEmoji, '🔗');
  assert.equal(label.getAttribute('aria-label'), 'تسمية');
  assert.equal(placeholder.getAttribute('placeholder'), 'عنصر نائب');
  assert.equal(title.getAttribute('title'), 'تلميح');
  assert.equal(input.value, 'قيمة');
  assert.equal(input.defaultValue, 'قيمة');

  format.dataset.i18n = 'screen.title';
  translateDocument(document);
  assert.equal(format.dataset.i18nEmoji, undefined);

  input.value = 'User edit';
  await initializeLanguage({ locale: 'en-US', baseUrl, fetcher });
  translateDocument(document);
  assert.equal(document.documentElement.dir, 'ltr');
  assert.equal(input.value, 'User edit');

  await initializeLanguage({ locale: 'en-XA', baseUrl, fetcher });
  translateDocument(document);
  assert.equal(document.documentElement.classList.contains('i18n-debug'), true);
  assert.equal(text.textContent, 'screen.title');
  assert.equal(input.value, 'User edit');
  assert.equal((await preloadTranslationEntries()).length, 2);
});
