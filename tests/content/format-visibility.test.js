import assert from 'node:assert/strict';
import { createFormatVisibility } from '../../src/js/app/ui/content/format-visibility.js';

const fieldset = (active = false) => ({
  hidden: !active,
  attributes: new Map(),
  classList: {
    active,
    add() {
      this.active = true;
    },
    remove() {
      this.active = false;
    },
  },
  setAttribute(name, value) {
    this.attributes.set(name, value);
  },
});

const fields = {
  url: fieldset(true),
  event: fieldset(),
  wifi: fieldset(),
};
const secretToggle = fieldset();
const document = {
  getElementById: () => secretToggle,
  querySelector(selector) {
    if (selector === '.format-fields.is-active') return fields.url;
    const format = selector.match(/data-format-fields="([^"]+)/)?.[1];
    return fields[format] ?? null;
  },
};
const controls = {
  format: { value: 'event' },
  bulkEnabled: { checked: false },
  dataTab: { dataset: { i18nEmoji: '🔗' } },
};
let releasePreparation;
let fileSyncs = 0;
let eventSyncs = 0;
let bulkSyncs = 0;
let failPreparation = false;
const sync = createFormatVisibility({
  document,
  elements: controls,
  syncBulk: () => {
    bulkSyncs += 1;
  },
  syncFile: () => {
    fileSyncs += 1;
  },
  syncEvent: () => {
    eventSyncs += 1;
  },
  prepareFormat: () =>
    failPreparation
      ? Promise.reject(new Error('load failed'))
      : new Promise((resolve) => {
          releasePreparation = resolve;
        }),
});

sync();
assert.equal(controls.dataTab.dataset.i18nEmoji, '📅');
assert.equal(fields.url.hidden, true);
assert.equal(fields.event.hidden, false);
assert.equal(fields.event.attributes.get('aria-hidden'), 'false');
assert.equal(fileSyncs, 0);
assert.equal(eventSyncs, 0);
releasePreparation();
await Promise.resolve();
await Promise.resolve();
assert.equal(fileSyncs, 1);
assert.equal(eventSyncs, 1);

controls.format.value = 'wifi';
sync();
assert.equal(controls.dataTab.dataset.i18nEmoji, '📶');
releasePreparation();
await Promise.resolve();
assert.equal(fields.event.hidden, true);
assert.equal(secretToggle.hidden, false);

sync();
releasePreparation();
await Promise.resolve();
assert.equal(fields.wifi.hidden, false);

controls.bulkEnabled.checked = true;
controls.format.value = 'url';
sync();
releasePreparation();
await Promise.resolve();
assert.equal(fields.wifi.hidden, true);
assert.equal(secretToggle.hidden, true);
assert.equal(secretToggle.attributes.get('aria-hidden'), 'true');
assert.equal(bulkSyncs, 4);

const originalError = console.error;
let errors = 0;
console.error = () => {
  errors += 1;
};
try {
  failPreparation = true;
  sync();
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(errors, 1);
} finally {
  console.error = originalError;
}

console.log('Format visibility tests passed.');
