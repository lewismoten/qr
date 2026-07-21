import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  FRAME_FONT_OPTIONS,
  getFrameFont,
  getFrameFontOption,
  isFrameFontRecommended,
} from '../../src/js/app/ui/content/frame/font-options.js';
import {
  getFrameFontGroups,
  isFrameFontAvailable,
} from '../../src/js/app/ui/content/frame/font-groups.js';
import { createFontPicker } from '../../src/js/app/ui/content/frame/font-picker.js';

class FakeClassList {
  values = new Set();

  toggle(name, enabled) {
    if (enabled) this.values.add(name);
    else this.values.delete(name);
  }

  contains(name) {
    return this.values.has(name);
  }
}

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.dataset = {};
    this.style = {};
    this.classList = new FakeClassList();
    this.listeners = new Map();
    this.attributes = new Map();
    this.open = false;
    this.value = '';
  }

  append(...children) {
    this.children.push(...children);
  }

  replaceChildren(...children) {
    this.children = children;
  }

  setAttribute(name, value) {
    this.attributes.set(name, value);
  }

  addEventListener(name, listener) {
    const listeners = this.listeners.get(name) || [];
    listeners.push(listener);
    this.listeners.set(name, listeners);
  }

  dispatch(name, event = { target: this }) {
    this.listeners.get(name)?.forEach((listener) => listener(event));
  }

  querySelectorAll(selector) {
    const matches = [];
    const visit = (element) => {
      if (selector === '[data-font-value]' && element.dataset.fontValue) {
        matches.push(element);
      }
      if (selector === 'a' && element.tagName === 'a') matches.push(element);
      element.children.forEach(visit);
    };
    this.children.forEach(visit);
    return matches;
  }

  showModal() {
    this.open = true;
  }

  close(value = '') {
    this.open = false;
    this.returnValue = value;
  }

  focus(options) {
    this.focusOptions = options;
  }
}

function createDocument(availableFonts = []) {
  const listeners = new Map();
  const document = {
    body: new FakeElement('body'),
    defaultView: {},
    fonts: {
      check: (query) => availableFonts.some((font) => query.includes(font)),
    },
    createElement: (name) => new FakeElement(name),
    addEventListener(name, listener) {
      listeners.set(name, listener);
    },
    dispatch(name) {
      listeners.get(name)?.();
    },
  };
  document.defaultView.Event = class {
    constructor(type, options) {
      this.type = type;
      this.bubbles = options?.bubbles;
    }
  };
  return document;
}

test('frame font registry provides named stacks and a safe fallback', () => {
  assert.equal(FRAME_FONT_OPTIONS.length, 23);
  assert.equal(getFrameFontOption('times').label, 'Times New Roman');
  assert.equal(getFrameFontOption('missing').value, 'sans');
  assert.match(getFrameFont('courier', 18), /^700 18px "Courier New"/);
  assert.match(getFrameFont('missing', 20), /^800 20px "Avenir Next"/);
});

test('font groups prioritize the locale and report availability', () => {
  const document = createDocument(['Arial', 'Geeza Pro']);
  const groups = getFrameFontGroups({
    document,
    locale: 'ar',
  });
  assert.equal(groups[0].id, 'general');
  assert.equal(groups[1].id, 'arabic');
  assert.equal(groups[0].options.length, 3);
  const geeza = groups[1].options.find(
    ({ option }) => option.value === 'geeza',
  );
  assert.equal(geeza.installed, true);
  assert.equal(isFrameFontRecommended(geeza.option, 'ar-EG'), true);
  assert.equal(isFrameFontRecommended(getFrameFontOption('sans'), 'ar'), false);
  assert.equal(
    isFrameFontRecommended(getFrameFontOption('arial'), null),
    false,
  );
  assert.equal(groups.flatMap(({ options }) => options).length, 23);
  assert.equal(isFrameFontAvailable(getFrameFontOption('sans'), null), true);
  assert.equal(isFrameFontAvailable(getFrameFontOption('arial'), {}), false);
  assert.equal(
    isFrameFontAvailable(getFrameFontOption('arial'), {
      fonts: {
        check: () => {
          throw new Error('blocked');
        },
      },
    }),
    false,
  );
  assert.equal(getFrameFontGroups({ document, locale: null })[0].id, 'general');
});

test('font picker reflects, changes, and closes the selected font', () => {
  const document = createDocument(['Arial', 'Times New Roman']);
  const select = new FakeElement('select');
  const events = [];
  let renders = 0;
  select.value = 'sans';
  select.dispatchEvent = (event) => events.push(event);
  const picker = createFontPicker({
    document,
    select,
    onSelect: () => {
      renders += 1;
    },
  });
  const dialog = document.body.children[0];
  const [heading, groups, close] = dialog.children[0].children;
  const getChoice = (value) =>
    groups
      .querySelectorAll('[data-font-value]')
      .find((choice) => choice.dataset.fontValue === value);

  picker.open();
  picker.open();
  let sans = getChoice('sans');
  let arial = getChoice('arial');
  assert.equal(dialog.open, true);
  assert.equal(heading.textContent, 'Choose a font');
  assert.equal(sans.classList.contains('is-active'), true);
  assert.deepEqual(sans.focusOptions, { preventScroll: true });
  assert.equal(arial.dataset.recommended, 'Recommended');
  assert.equal(
    groups.children[0].children[0].children[0].textContent,
    '\u{1F310}',
  );
  assert.equal(
    groups.children[0].children[0].children[1].textContent,
    'General',
  );
  assert.equal(groups.children[0].children[1].children.length, 3);
  assert.equal(getChoice('geeza').disabled, true);
  assert.ok(groups.querySelectorAll('a').length > 0);
  assert.equal(groups.querySelectorAll('a')[0].target, '_blank');

  arial.dispatch('click');
  assert.equal(select.value, 'arial');
  assert.equal(events[0].type, 'change');
  assert.equal(events[0].bubbles, true);
  assert.equal(renders, 1);
  sans = getChoice('sans');
  arial = getChoice('arial');
  assert.equal(sans.classList.contains('is-active'), false);
  assert.equal(sans.attributes.get('aria-pressed'), 'false');
  assert.equal(arial.classList.contains('is-active'), true);
  assert.equal(arial.attributes.get('aria-pressed'), 'true');
  assert.equal(dialog.open, false);
  assert.equal(dialog.returnValue, 'arial');

  select.value = 'times';
  document.dispatch('languagechange');
  picker.sync();
  picker.open();
  const times = getChoice('times');
  assert.equal(times.classList.contains('is-active'), true);
  assert.deepEqual(times.focusOptions, { preventScroll: true });
  close.dispatch('click');
  assert.equal(dialog.open, false);
  picker.open();
  dialog.dispatch('click', { target: dialog });
  assert.equal(dialog.open, false);
  select.value = 'missing';
  picker.open();
  assert.equal(dialog.open, true);
});

test('frame guide exposes the font picker and selected value', async () => {
  const source = await readFile(
    new URL('../../src/html/guides/content/frame.html', import.meta.url),
    'utf8',
  );
  assert.match(source, /id="frame-font-more"/);
  assert.match(source, /id="frame-font-selected-value"/);
  assert.match(source, /data-i18n="frame\.selectedFont"/);
  assert.equal(source.match(/data-choice-target="frame-font"/g)?.length, 3);
  assert.doesNotMatch(source, /data-choice-value="rounded"/);
});

test('frame setup carries the render callback through the pipeline', async () => {
  const [controller, encoding] = await Promise.all([
    readFile(
      new URL('../../src/js/app/app-controller.js', import.meta.url),
      'utf8',
    ),
    readFile(
      new URL('../../src/js/app/ui/content/encoding-setup.js', import.meta.url),
      'utf8',
    ),
  ]);
  assert.match(controller, /getFrameIndex:[^}]+render: runtime\.render/s);
  assert.match(encoding, /getFrameIndex:[^}]+render: runtime\.render/s);
});
