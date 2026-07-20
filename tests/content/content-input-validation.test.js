import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, test } from 'node:test';
import { LIMITS } from '../../src/js/app/configuration.js';
import { validateEvent } from '../../src/js/app/ui/content/event/event-content-validation.js';
import { parseCoordinate } from '../../src/js/app/ui/content/geo/coordinates.js';
import { createWifiPlugin } from '../../src/js/app/ui/content/wifi/wifi-content-plugin.js';
import {
  validateWifi,
  validateWifiValues,
} from '../../src/js/app/ui/content/wifi/wifi-content-validation.js';

const hasError = (value) => assert.notEqual(value, '');

function createDocument(values) {
  const elements = Object.fromEntries(
    Object.entries(values).map(([id, value]) => [
      id,
      typeof value === 'object' ? value : { value },
    ]),
  );
  return { getElementById: (id) => elements[id] };
}

describe('Wi-Fi validation', () => {
  test('checks security and SSID boundaries', () => {
    const validate = (values) =>
      validateWifiValues({
        security: 'nopass',
        ssid: 'Guest',
        password: '',
        ...values,
      });

    hasError(validate({ security: 'enterprise' }));
    hasError(validate({ ssid: '   ' }));
    hasError(validate({ ssid: 'bad\u0000name' }));
    hasError(validate({ ssid: 'x'.repeat(33) }));
    hasError(validate({ ssid: '界'.repeat(11) }));
    assert.equal(validate({}), '');
  });

  test('checks WPA and WEP password forms', () => {
    const validate = (security, password) =>
      validateWifiValues({ security, ssid: 'Office', password });

    hasError(validate('WPA', ''));
    hasError(validate('WPA', 'short'));
    hasError(validate('WPA', 'x'.repeat(65)));
    hasError(validate('WPA', 'a'.repeat(63) + 'z'));
    hasError(validate('WPA', 'bad\u0000password'));
    assert.equal(validate('WPA', 'secure passphrase'), '');
    assert.equal(validate('WPA', 'a'.repeat(64)), '');

    assert.equal(validate('WEP', 'abcde'), '');
    assert.equal(validate('WEP', '0123456789'), '');
    assert.equal(validate('WEP', 'ABCDEFGHIJKLM'), '');
    assert.equal(validate('WEP', 'a'.repeat(26)), '');
    hasError(validate('WEP', '界界界界界'));
    hasError(validate('WEP', 'abcdef'));
  });

  test('exposes a plugin validation state', () => {
    const document = createDocument({
      'wifi-encryption': 'WPA',
      'wifi-ssid': 'Office',
      'wifi-password': 'secure passphrase',
    });
    assert.deepEqual(validateWifi(document), {
      error: '',
      warning: '',
    });

    const section = {
      buildPayload: () => 'payload',
      buildPreview: () => 'preview',
      maskPayload: (value) => value,
    };
    const plugin = createWifiPlugin({ document, section });
    assert.equal(plugin.build(), 'payload');
    assert.equal(plugin.preview(), 'preview');
    assert.equal(plugin.maskPreview('masked'), 'masked');
    assert.deepEqual(plugin.validate(), { error: '', warning: '' });
  });
});

describe('structured input validation', () => {
  test('rejects partial and non-finite coordinates', () => {
    assert.equal(parseCoordinate('38.9182'), 38.9182);
    assert.equal(parseCoordinate(''), null);
    assert.equal(parseCoordinate('38.9junk'), null);
    assert.equal(parseCoordinate('Infinity'), null);
  });

  test('rejects invalid event fields, dates, and times', () => {
    const baseline = {
      'event-title': 'Launch',
      'event-all-day': { checked: false },
      'event-start-date': '2025-02-28',
      'event-start-time': '09:00',
      'event-end-date': '2025-03-01',
      'event-end-time': '10:00',
      'event-location': '',
      'event-description': '',
      'event-url': '',
    };
    const validate = (changes = {}) =>
      validateEvent(createDocument({ ...baseline, ...changes }), LIMITS);
    const invalid = (changes) => hasError(validate(changes).error);

    invalid({ 'event-title': 'bad\u0000title' });
    invalid({ 'event-start-date': '' });
    invalid({ 'event-end-date': '' });
    invalid({ 'event-start-date': '2025-02-29' });
    invalid({
      'event-all-day': { checked: true },
      'event-end-date': '2025-02-27',
    });
    invalid({ 'event-start-time': '' });
    invalid({ 'event-end-time': '' });
    invalid({ 'event-start-time': '25:00' });
    invalid({
      'event-end-date': '2025-02-28',
      'event-end-time': '08:59',
    });
    invalid({ 'event-location': 'x'.repeat(161) });
    invalid({ 'event-description': 'bad\u0000description' });
    assert.deepEqual(validate(), {
      error: '',
      warning: '',
    });
  });

  test('declares matching browser-side length limits', async () => {
    const sources = [
      '../../src/html/index.html',
      '../../src/html/guides/content/wifi.html',
      '../../src/html/guides/content/email.html',
      '../../src/html/guides/content/phone.html',
      '../../src/html/guides/content/sms.html',
      '../../src/html/guides/content/geo.html',
      '../../src/html/guides/content/vcard.html',
    ];
    const html = (
      await Promise.all(
        sources.map((source) =>
          readFile(new URL(source, import.meta.url), { encoding: 'utf8' }),
        ),
      )
    ).join('\n');
    for (const [id, maxLength] of [
      ['url-input', 2048],
      ['wifi-ssid', 32],
      ['wifi-password', 64],
      ['email-to', 254],
      ['email-subject', 120],
      ['phone-number', 40],
      ['sms-body', 160],
      ['geo-query', 80],
      ['vcard-name', 80],
    ]) {
      const pattern = '<[^>]+id="' + id + '"[^>]*>';
      const field = html.match(new RegExp(pattern))?.[0];
      assert.match(field, new RegExp('maxlength="' + maxLength + '"'));
    }
  });
});
