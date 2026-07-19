import assert from 'node:assert/strict';
import test from 'node:test';

import {
  formatLocalizedDate,
  localizeDates,
} from '../../../src/js/i18n/date.js';

test('localized dates use the requested locale and preserve invalid values', () => {
  assert.equal(formatLocalizedDate('2026-07-17', 'en-US'), 'July 17, 2026');
  assert.equal(formatLocalizedDate('2026-07-17', 'en-GB'), '17 July 2026');
  assert.equal(formatLocalizedDate('2026-07-17', 'es'), '17 de julio de 2026');
  assert.equal(
    formatLocalizedDate('2026-07-17T22:15:00.000Z', 'en-GB'),
    '17 July 2026',
  );
  assert.equal(formatLocalizedDate('not-a-date', 'es'), 'not-a-date');
  assert.equal(formatLocalizedDate('2026-99-99', 'en-US'), '2026-99-99');
});

test('localized dates update semantic time elements', () => {
  const localized = {
    getAttribute: (name) =>
      name === 'datetime' ? '2026-07-17T22:15:00.000Z' : null,
    textContent: '',
  };
  const missing = {
    getAttribute: () => null,
    textContent: '',
  };
  const document = {
    querySelectorAll: () => [localized, missing],
  };

  localizeDates(document, 'en-GB');

  assert.equal(localized.textContent, '17 July 2026');
  assert.equal(missing.textContent, '');
});
