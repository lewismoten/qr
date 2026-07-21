import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  FRAME_FONT_OPTIONS,
  getFrameFont,
  getFrameFontOption,
} from '../../src/js/app/ui/content/frame/font-options.js';
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
}

function createDocument() {
  const listeners = new Map();
  const document = {
    body: new FakeElement('body'),
    defaultView: {},
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
  assert.equal(FRAME_FONT_OPTIONS.length, 12);
  assert.equal(getFrameFontOption('times').label, 'Times New Roman');
  assert.equal(getFrameFontOption('missing').value, 'sans');
  assert.match(getFrameFont('courier', 18), /^700 18px "Courier New"/);
  assert.match(getFrameFont('missing', 20), /^800 20px "Avenir Next"/);
});

test('font picker reflects, changes, and closes the selected font', () => {
  const document = createDocument();
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
  const [heading, grid, close] = dialog.children[0].children;
  const choices = grid.querySelectorAll('[data-font-value]');

  picker.open();
  picker.open();
  assert.equal(dialog.open, true);
  assert.equal(heading.textContent, 'Choose a font');
  assert.equal(choices.length, FRAME_FONT_OPTIONS.length);
  assert.equal(choices[0].classList.contains('is-active'), true);

  choices[4].dispatch('click');
  assert.equal(select.value, 'arial');
  assert.equal(events[0].type, 'change');
  assert.equal(events[0].bubbles, true);
  assert.equal(renders, 1);
  assert.equal(dialog.open, false);
  assert.equal(dialog.returnValue, 'arial');

  select.value = 'times';
  document.dispatch('languagechange');
  picker.sync();
  picker.open();
  assert.equal(choices[7].classList.contains('is-active'), true);
  close.dispatch('click');
  assert.equal(dialog.open, false);
  picker.open();
  dialog.dispatch('click', { target: dialog });
  assert.equal(dialog.open, false);
});

test('frame guide exposes the font picker and selected value', async () => {
  const source = await readFile(
    new URL('../../src/html/guides/content/frame.html', import.meta.url),
    'utf8',
  );
  assert.match(source, /id="frame-font-more"/);
  assert.match(source, /id="frame-font-selected-value"/);
  assert.match(source, /data-i18n="frame\.selectedFont"/);
});
