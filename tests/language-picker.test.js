import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getActiveLocale, initializeLanguage } from '../src/js/i18n/index.js';
import {
  getSavedLocale,
  LOCALE_STORAGE_KEY,
  prioritizeLocales,
  setupLanguagePicker,
} from '../src/js/i18n/picker.js';

class ClassList {
  names = new Set();

  add(...names) {
    names.forEach((name) => this.names.add(name));
  }

  remove(...names) {
    names.forEach((name) => this.names.delete(name));
  }

  toggle(name, force) {
    const enabled = force ?? !this.names.has(name);
    if (enabled) this.names.add(name);
    else this.names.delete(name);
    return enabled;
  }

  contains(name) {
    return this.names.has(name);
  }
}

class Element extends EventTarget {
  children = [];
  attributes = new Map();
  classList = new ClassList();
  hidden = false;
  disabled = false;
  focused = false;
  textContent = '';

  set className(value) {
    this.classList.names = new Set(value.split(/\s+/).filter(Boolean));
  }

  get className() {
    return [...this.classList.names].join(' ');
  }

  append(...children) {
    children.forEach((child) => {
      child.parent = this;
      this.children.push(child);
    });
  }

  appendChild(child) {
    this.append(child);
    return child;
  }

  replaceChildren(...children) {
    this.children = [];
    this.append(...children);
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

  querySelector(selector) {
    if (selector !== '[aria-current="true"]') return null;
    return this.children.find(
      (child) => child.getAttribute('aria-current') === 'true',
    );
  }

  contains(target) {
    return (
      target === this || this.children.some((child) => child.contains(target))
    );
  }

  focus() {
    this.focused = true;
  }
}

class Document extends EventTarget {
  constructor() {
    super();
    this.elements = new Map();
    for (const id of [
      'language-picker',
      'language-picker-trigger',
      'language-picker-panel',
      'language-picker-grid',
    ]) {
      this.elements.set(id, new Element());
    }
    this.elements
      .get('language-picker')
      .append(
        this.elements.get('language-picker-trigger'),
        this.elements.get('language-picker-panel'),
      );
    this.elements
      .get('language-picker-panel')
      .append(this.elements.get('language-picker-grid'));
    this.elements.get('language-picker-panel').hidden = true;
  }

  getElementById(id) {
    return this.elements.get(id) || null;
  }

  createElement() {
    return new Element();
  }
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

test('language picker renders, switches, persists, and closes', async () => {
  const baseUrl = new URL('https://example.test/locales/');
  const resources = {
    'manifest.json': {
      defaultLocale: 'en-US',
      locales: [
        { code: 'en-US', flag: '🇺🇸' },
        { code: 'es', flag: '🇪🇸' },
        { code: 'en-XA', flag: '🐞', debug: true },
      ],
    },
    'en-US.json': { language: { current: 'Language: {language}.' } },
    'es.json': { language: { current: 'Idioma: {language}.' } },
    'en-XA.json': { $debug: true },
  };
  const fetcher = createFetcher(resources);
  await initializeLanguage({ locale: 'en-US', baseUrl, fetcher });

  const document = new Document();
  const saved = [];
  let storageFailure = false;
  let localeFailure = false;
  const storage = {
    setItem(...values) {
      saved.push(values);
      if (storageFailure) throw new Error('Storage write failed');
    },
  };
  const previousAnimationFrame = globalThis.requestAnimationFrame;
  globalThis.requestAnimationFrame = (callback) => callback();

  try {
    setupLanguagePicker({
      document,
      storage,
      languages: ['es-MX'],
      onLocaleChange(locale) {
        if (localeFailure) throw new Error('Locale change failed');
        return initializeLanguage({ locale, baseUrl, fetcher });
      },
    });
    const picker = document.getElementById('language-picker');
    const trigger = document.getElementById('language-picker-trigger');
    const panel = document.getElementById('language-picker-panel');
    const grid = document.getElementById('language-picker-grid');

    assert.equal(trigger.textContent, '🇺🇸');
    assert.deepEqual(
      grid.children.map(({ lang }) => lang),
      ['es', 'en-US', 'en-XA'],
    );
    assert.equal(
      grid.children.at(-1).classList.contains('language-option-debug'),
      true,
    );

    trigger.dispatchEvent(new Event('click'));
    assert.equal(panel.hidden, false);
    assert.equal(trigger.getAttribute('aria-expanded'), 'true');
    assert.equal(grid.children[1].focused, true);

    grid.children[0].dispatchEvent(new Event('click'));
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(getActiveLocale(), 'es');
    assert.deepEqual(saved, [[LOCALE_STORAGE_KEY, 'es']]);
    assert.equal(trigger.textContent, '🇪🇸');
    assert.equal(trigger.disabled, false);
    assert.equal(picker.classList.contains('is-loading'), false);

    trigger.dispatchEvent(new Event('click'));
    grid.children[0].dispatchEvent(new Event('click'));
    assert.equal(panel.hidden, true);
    assert.equal(trigger.focused, true);

    storageFailure = true;
    trigger.dispatchEvent(new Event('click'));
    grid.children[1].dispatchEvent(new Event('click'));
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(getActiveLocale(), 'en-US');
    assert.equal(trigger.disabled, false);

    localeFailure = true;
    const originalError = console.error;
    let errors = 0;
    console.error = () => {
      errors += 1;
    };
    trigger.dispatchEvent(new Event('click'));
    grid.children[0].dispatchEvent(new Event('click'));
    await new Promise((resolve) => setTimeout(resolve, 0));
    console.error = originalError;
    assert.equal(errors, 1);
    assert.equal(getActiveLocale(), 'en-US');
    assert.equal(trigger.disabled, false);

    trigger.dispatchEvent(new Event('click'));
    document.dispatchEvent(new Event('pointerdown'));
    assert.equal(panel.hidden, true);

    trigger.dispatchEvent(new Event('click'));
    document.dispatchEvent(
      Object.assign(new Event('keydown'), { key: 'Escape' }),
    );
    assert.equal(panel.hidden, true);
    assert.equal(trigger.focused, true);
  } finally {
    globalThis.requestAnimationFrame = previousAnimationFrame;
  }
});

test('language picker tolerates missing markup', () => {
  assert.doesNotThrow(() =>
    setupLanguagePicker({ document: { getElementById: () => null } }),
  );
});

test('locale priority and storage tolerate invalid platform data', () => {
  assert.deepEqual(
    prioritizeLocales(
      [
        { code: 'invalid_locale' },
        { code: 'en-XA' },
        { code: 'fr' },
        { code: 'en-US' },
      ],
      'invalid_locale',
    ).map(({ code }) => code),
    ['invalid_locale', 'fr', 'en-US', 'en-XA'],
  );

  const descriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    'localStorage',
  );
  try {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: { getItem: () => 'fr' },
    });
    assert.equal(getSavedLocale(), 'fr');
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('Storage unavailable');
      },
    });
    assert.equal(getSavedLocale(), undefined);
  } finally {
    if (descriptor)
      Object.defineProperty(globalThis, 'localStorage', descriptor);
    else delete globalThis.localStorage;
  }
});
