import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  getWebsiteValidationState,
  isValidBulkDate,
  isValidBulkTime,
  validateCalendarText,
  validateEmailValue,
  validateGeoLabel,
  validatePrintableText,
  validateTelephoneValue,
  validateVCardTextValue,
} from '../src/js/app/validation.js';

const hasError = (value) => assert.notEqual(value, '');

describe('contact validation', () => {
  test('validates required and optional email addresses', () => {
    hasError(validateEmailValue(''));
    assert.equal(validateEmailValue('', { required: false }), '');
    hasError(validateEmailValue('person@example'));
    hasError(validateEmailValue('person\u0000@example.com'));
    assert.equal(validateEmailValue(' person@example.com '), '');
    hasError(validateEmailValue(`${'a'.repeat(243)}@example.com`));
  });

  test('validates telephone syntax and digit counts', () => {
    hasError(validateTelephoneValue(''));
    assert.equal(validateTelephoneValue('', { required: false }), '');
    assert.equal(validateTelephoneValue('+1 (530) 539-4775'), '');
    hasError(validateTelephoneValue('530/CALL-NOW'));
    hasError(validateTelephoneValue('530+5394775'));
    hasError(validateTelephoneValue('+1+5305394775'));
    hasError(validateTelephoneValue('12345'));
    hasError(validateTelephoneValue('+1' + ' '.repeat(30) + '5305394775'));
    hasError(validateTelephoneValue(`+${'1'.repeat(16)}`));
  });
});

describe('general text validation', () => {
  test('enforces printable text and length limits', () => {
    assert.equal(
      validatePrintableText('Visible text', { label: 'text', maxLength: 20 }),
      '',
    );
    hasError(
      validatePrintableText('Too long', { label: 'text', maxLength: 4 }),
    );
    hasError(
      validatePrintableText('bad\u0000text', {
        label: 'text',
        maxLength: 20,
      }),
    );
  });

  test('supports international geographic and vCard labels', () => {
    assert.equal(validateGeoLabel('Front Royal, VA'), '');
    assert.equal(validateGeoLabel('弗朗特罗亚尔，弗吉尼亚州'), '');
    assert.equal(validateGeoLabel(''), '');
    hasError(validateGeoLabel('x'.repeat(81)));
    hasError(validateGeoLabel('line\nbreak'));

    assert.equal(validateVCardTextValue('Lewis Moten III'), '');
    assert.equal(validateVCardTextValue(''), '');
    hasError(validateVCardTextValue('', { required: true, label: 'name' }));
    hasError(
      validateVCardTextValue('long value', {
        label: 'name',
        maxLength: 4,
      }),
    );
    hasError(validateVCardTextValue('line\nbreak', { label: 'name' }));
  });
});

describe('website validation', () => {
  test('requires an HTTP protocol and warns for insecure URLs', () => {
    assert.deepEqual(getWebsiteValidationState(''), {
      error: '',
      warning: '',
    });
    hasError(getWebsiteValidationState('', { required: true }).error);
    hasError(getWebsiteValidationState('example.com').error);
    hasError(getWebsiteValidationState('ftp://example.com').error);
    hasError(
      getWebsiteValidationState('https://example.com/'.padEnd(2049, 'x')).error,
    );
    assert.deepEqual(getWebsiteValidationState('https://example.com'), {
      error: '',
      warning: '',
    });
    const insecure = getWebsiteValidationState('http://example.com');
    assert.equal(insecure.error, '');
    hasError(insecure.warning);
  });
});

describe('calendar and bulk date validation', () => {
  test('validates calendar text controls and line breaks', () => {
    hasError(
      validateCalendarText('', {
        required: true,
        label: 'title',
        maxLength: 20,
      }),
    );
    assert.equal(
      validateCalendarText('', {
        label: 'title',
        maxLength: 20,
      }),
      '',
    );
    hasError(
      validateCalendarText('too long', {
        label: 'title',
        maxLength: 3,
      }),
    );
    hasError(
      validateCalendarText('line\nbreak', {
        label: 'title',
        maxLength: 20,
      }),
    );
    assert.equal(
      validateCalendarText('line\nbreak', {
        label: 'description',
        maxLength: 20,
        multiline: true,
      }),
      '',
    );
    hasError(
      validateCalendarText('bad\u0000text', {
        label: 'description',
        maxLength: 20,
        multiline: true,
      }),
    );
  });

  test('recognizes real dates and 24-hour times', () => {
    assert.equal(isValidBulkDate('2024-02-29'), true);
    assert.equal(isValidBulkDate('2023-02-29'), false);
    assert.equal(isValidBulkDate('2024-13-01'), false);
    assert.equal(isValidBulkDate('02/29/2024'), false);
    assert.equal(isValidBulkTime('00:00'), true);
    assert.equal(isValidBulkTime('23:59'), true);
    assert.equal(isValidBulkTime('24:00'), false);
    assert.equal(isValidBulkTime('12:60'), false);
    assert.equal(isValidBulkTime('9:30'), false);
  });
});
