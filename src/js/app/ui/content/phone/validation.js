import { lookup } from '../../../../i18n/index.js';
import { validateTelephoneValue } from '../../../validation.js';

const invalid = (error) => ({ error, warning: '' });

export function validatePhone(document, format, limits) {
  const inputId = format === 'sms' ? 'sms-number' : 'phone-number';
  const error = validateTelephoneValue(
    document.getElementById(inputId).value,
    format === 'sms'
      ? {
          label: lookup('fields.smsPhone', 'SMS phone number'),
          contextLabel: lookup('formats.sms', 'SMS'),
        }
      : {},
  );
  if (error) return invalid(error);
  if (
    format === 'sms' &&
    document.getElementById('sms-body').value.length > limits.sms
  ) {
    return invalid(
      lookup(
        'validation.sms.length',
        'Not valid for SMS format yet: message should stay at {maxLength} characters or fewer for broad SMS compatibility.',
        { maxLength: limits.sms },
      ),
    );
  }
  return { error: '', warning: '' };
}
