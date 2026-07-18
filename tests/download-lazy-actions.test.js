import assert from 'node:assert/strict';
import { test } from 'node:test';
import { setupLazyDownloadActions } from '../src/js/app/ui/download/lazy-actions.js';

function createButton() {
  const listeners = new Map();
  return {
    clicks: 0,
    listeners,
    addEventListener(name, listener) {
      const entries = listeners.get(name) ?? [];
      entries.push(listener);
      listeners.set(name, entries);
    },
    click() {
      this.clicks += 1;
    },
  };
}

function createEvent() {
  return {
    prevented: false,
    stopped: false,
    preventDefault() {
      this.prevented = true;
    },
    stopImmediatePropagation() {
      this.stopped = true;
    },
  };
}

test('lazy actions load once and watch buttons from later fragments', async () => {
  const currentButton = createButton();
  const currentPdfButton = createButton();
  let resolveImport;
  let imports = 0;
  let attachments = 0;
  const importer = () => {
    imports += 1;
    return new Promise((resolve) => {
      resolveImport = resolve;
    });
  };
  const controller = setupLazyDownloadActions({ currentButton }, importer);
  assert.equal(currentButton.listeners.get('click').length, 1);

  const event = createEvent();
  const click = currentButton.listeners.get('click')[0](event);
  const preload = currentButton.listeners.get('focus')[0]();
  assert.equal(imports, 1);
  resolveImport({
    createDownloadActions: () => ({
      attachButtons() {
        attachments += 1;
      },
    }),
  });
  await Promise.all([click, preload]);
  assert.equal(event.prevented, true);
  assert.equal(event.stopped, true);
  assert.equal(currentButton.clicks, 1);

  await currentButton.listeners.get('click')[0](createEvent());
  await currentButton.listeners.get('focus')[0]();
  assert.equal(imports, 1);
  controller.update({ currentPdfButton });
  assert.equal(currentPdfButton.listeners.get('click').length, 1);
  assert.equal(attachments, 1);
  controller.update({ currentPdfButton });
  assert.equal(currentPdfButton.listeners.get('click').length, 1);
  assert.equal(attachments, 2);
});

test('lazy actions report load failures and permit retries', async () => {
  const currentButton = createButton();
  const status = { textContent: '' };
  let imports = 0;
  const importer = async () => {
    imports += 1;
    throw new Error('Unavailable');
  };
  const originalError = console.error;
  console.error = () => {};
  try {
    setupLazyDownloadActions({ currentButton, status }, importer);
    const event = createEvent();
    await currentButton.listeners.get('click')[0](event);
    assert.equal(status.textContent, 'Download tools could not be loaded.');
    await currentButton.listeners.get('pointerenter')[0]();
    assert.equal(imports, 2);
  } finally {
    console.error = originalError;
  }
});
