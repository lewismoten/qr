import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  formatPhoneNumberForDisplay,
  normalizePhoneNumber,
} from '../../src/js/app/data/phone.js';

describe('phone normalization', () => {
  test('normalizes domestic and international input', () => {
    assert.equal(normalizePhoneNumber(''), '');
    assert.equal(normalizePhoneNumber('extension only'), '');
    assert.equal(normalizePhoneNumber('(530) 539-4775'), '+15305394775');
    assert.equal(normalizePhoneNumber('1-530-539-4775'), '+15305394775');
    assert.equal(normalizePhoneNumber('+44 20 7946 0958'), '+442079460958');
    assert.equal(normalizePhoneNumber('44 20 7946 0958'), '+442079460958');
  });

  test('formats North American numbers for display', () => {
    const number = '+1 530 539 4775';
    assert.equal(formatPhoneNumberForDisplay(number, 'usa'), '(530) 539-4775');
    assert.equal(
      formatPhoneNumberForDisplay(number, 'international'),
      '+1 530-539-4775',
    );
    assert.equal(
      formatPhoneNumberForDisplay(number, 'normalized'),
      '+15305394775',
    );
    assert.equal(formatPhoneNumberForDisplay(number, 'digits'), '15305394775');
  });

  test('preserves useful fallback values', () => {
    assert.equal(
      formatPhoneNumberForDisplay(' extension ', 'usa'),
      'extension',
    );
    assert.equal(
      formatPhoneNumberForDisplay('+44 20 7946 0958', 'usa'),
      '+442079460958',
    );
    assert.equal(
      formatPhoneNumberForDisplay('+44 20 7946 0958', 'digits'),
      '442079460958',
    );
  });
});
