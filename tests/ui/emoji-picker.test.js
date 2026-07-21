import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

import { createEmojiDialog } from '../../src/js/app/ui/style/art/emoji-dialog.js';
import { EMOJI_GROUPS } from '../../src/js/app/ui/style/art/emoji-options.js';
import { installEmojiPicker } from '../../src/js/app/ui/style/art/emoji-picker-setup.js';

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
    this.classList = new FakeClassList();
    this.listeners = new Map();
    this.attributes = new Map();
    this.open = false;
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

  async dispatch(name, event = { target: this }) {
    const listeners = this.listeners.get(name) || [];
    await Promise.all(listeners.map((listener) => listener(event)));
  }

  querySelectorAll(selector) {
    const matches = [];
    const visit = (element) => {
      if (!element || typeof element !== 'object') return;
      if (selector === '[data-emoji]' && element.dataset.emoji) {
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

  focus(options) {
    this.focusOptions = options;
  }
}

function createDocument() {
  const listeners = new Map();
  const document = {
    body: new FakeElement('body'),
    createElement: (name) => new FakeElement(name),
    addEventListener(name, listener) {
      listeners.set(name, listener);
    },
    dispatch(name) {
      listeners.get(name)?.();
    },
  };
  return document;
}

test('emoji options are unique and grouped by purpose', () => {
  const options = EMOJI_GROUPS.flatMap((group) => group.options);
  assert.equal(EMOJI_GROUPS.length, 5);
  assert.equal(options.length, 24);
  assert.equal(new Set(options.map(({ value }) => value)).size, options.length);
  assert.deepEqual(
    EMOJI_GROUPS.map(({ id }) => id),
    ['connect', 'places', 'shopping', 'symbols', 'leisure'],
  );
});

test('artwork form keeps only four emoji quick picks', async () => {
  const source = await readFile(
    new URL('../../src/html/guides/style/artwork.html', import.meta.url),
    'utf8',
  );
  assert.equal(source.match(/data-emoji-quick/g)?.length, 4);
  assert.equal(source.match(/class="emoji-option"/g)?.length, 4);
  assert.match(source, /id="center-emoji-more"/);
});

test('emoji dialog groups, selects, focuses, and closes options', async () => {
  const document = createDocument();
  const input = { value: '\u{1F517}' };
  const selections = [];
  const picker = createEmojiDialog({
    document,
    input,
    onSelect(value) {
      input.value = value;
      selections.push(value);
    },
  });
  const dialog = document.body.children[0];
  const [heading, groups, close] = dialog.children[0].children;

  picker.open();
  picker.open();
  const options = groups.querySelectorAll('[data-emoji]');
  const link = options.find(({ dataset }) => dataset.emoji === input.value);
  const smile = options.find(({ dataset }) => dataset.emoji === '\u{1F60A}');
  assert.equal(dialog.open, true);
  assert.equal(heading.textContent, 'Choose an emoji');
  assert.equal(groups.children.length, 5);
  assert.equal(link.classList.contains('is-active'), true);
  assert.deepEqual(link.focusOptions, { preventScroll: true });
  assert.equal(smile.attributes.get('aria-label'), 'Smile');

  await smile.dispatch('click');
  assert.deepEqual(selections, ['\u{1F60A}']);
  assert.equal(dialog.returnValue, '\u{1F60A}');
  assert.equal(dialog.open, false);
  document.dispatch('languagechange');
  picker.sync();
  picker.open();
  await close.dispatch('click');
  assert.equal(dialog.open, false);
  picker.open();
  await dialog.dispatch('click', { target: dialog });
  assert.equal(dialog.open, false);
});

test('more emoji setup loads once and retries failed requests', async () => {
  const button = new FakeElement('button');
  let loads = 0;
  let opens = 0;
  installEmojiPicker({
    button,
    document: {},
    input: {},
    load: async () => {
      loads += 1;
      return {
        createEmojiDialog: () => ({
          open() {
            opens += 1;
          },
        }),
      };
    },
    onSelect() {},
  });
  await button.dispatch('click');
  await button.dispatch('click');
  assert.equal(loads, 1);
  assert.equal(opens, 2);
  assert.doesNotThrow(() => installEmojiPicker({ button: null }));

  const retry = new FakeElement('button');
  const originalError = console.error;
  console.error = () => {};
  try {
    installEmojiPicker({
      button: retry,
      document: {},
      input: {},
      load: async () => {
        loads += 1;
        if (loads === 2) throw new Error('load failed');
        return { createEmojiDialog: () => ({ open() {} }) };
      },
      onSelect() {},
    });
    await retry.dispatch('click');
    await retry.dispatch('click');
    assert.equal(loads, 3);
  } finally {
    console.error = originalError;
  }
});

test('more emoji setup uses the default lazy-loaded dialog', async () => {
  const button = new FakeElement('button');
  const document = createDocument();
  installEmojiPicker({
    button,
    document,
    input: { value: '\u{1F517}' },
    onSelect() {},
  });

  await button.dispatch('click');
  assert.equal(document.body.children[0].open, true);
});
