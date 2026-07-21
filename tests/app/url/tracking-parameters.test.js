import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getTrackingParameterNames,
  removeTrackingParameters,
} from '../../../src/js/app/data/url-tracking.js';
import { setupUrlTrackingControl } from '../../../src/js/app/ui/content/simple/url-tracking-control.js';

test('detects common click identifiers and analytics parameters', () => {
  const url =
    'https://example.com/event?id=42&utm_source=newsletter&' +
    'FBCLID=click&_gl=state#details';
  assert.deepEqual(getTrackingParameterNames(url), [
    'utm_source',
    'FBCLID',
    '_gl',
  ]);
});

test('removes tracking without removing functional query or fragment data', () => {
  const url =
    'https://example.com/event?id=42&utm_campaign=spring&' +
    'gclid=click#registration';
  assert.equal(
    removeTrackingParameters(url),
    'https://example.com/event?id=42#registration',
  );
});

test('preserves unknown parameters and invalid input exactly', () => {
  const functional = 'https://example.com/?ref=friend&source=calendar';
  assert.deepEqual(getTrackingParameterNames(functional), []);
  assert.equal(removeTrackingParameters(functional), functional);
  assert.deepEqual(getTrackingParameterNames('not a URL'), []);
  assert.equal(removeTrackingParameters('not a URL'), 'not a URL');
});

test('removes repeated tracking parameters case-insensitively', () => {
  const url = 'https://example.com/?utm_term=one&utm_term=two&MSCLKID=three';
  assert.equal(removeTrackingParameters(url), 'https://example.com/');
});

test('tracking control removes detected parameters from its URL field', () => {
  const input = new EventTarget();
  const keep = new EventTarget();
  const open = new EventTarget();
  const remove = new EventTarget();
  const names = { textContent: '' };
  const dialog = {
    open: false,
    showModal() {
      this.open = true;
    },
    close(returnValue = '') {
      this.open = false;
      this.returnValue = returnValue;
    },
  };
  const control = {
    hidden: true,
    querySelector(selector) {
      if (selector === '[data-url-tracking-dialog]') return dialog;
      if (selector === '[data-url-tracking-keep]') return keep;
      if (selector === '[data-url-tracking-names]') return names;
      if (selector === '[data-url-tracking-open]') return open;
      if (selector === '[data-url-tracking-remove]') return remove;
      return null;
    },
  };
  input.value = 'https://example.com/?id=7&fbclid=click';
  input.ownerDocument = { defaultView: { Event } };
  input.closest = () => ({ querySelector: () => control });

  const tracking = setupUrlTrackingControl(input);
  assert.equal(control.hidden, false);
  assert.equal(names.textContent, 'fbclid');

  open.dispatchEvent(new Event('click'));
  assert.equal(dialog.open, true);
  keep.dispatchEvent(new Event('click'));
  assert.equal(dialog.open, false);
  assert.equal(dialog.returnValue, 'kept');

  open.dispatchEvent(new Event('click'));
  remove.dispatchEvent(new Event('click'));
  assert.equal(input.value, 'https://example.com/?id=7');
  assert.equal(control.hidden, true);
  assert.equal(dialog.open, false);
  assert.equal(dialog.returnValue, 'removed');

  dialog.open = true;
  tracking.sync();
  assert.equal(dialog.open, false);
  remove.dispatchEvent(new Event('click'));
  assert.equal(dialog.returnValue, '');

  const unavailable = setupUrlTrackingControl({ closest: () => null });
  assert.doesNotThrow(() => unavailable.sync());
});
