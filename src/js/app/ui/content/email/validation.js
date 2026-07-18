import { lookup } from '../../../../i18n/index.js';
import {
  validateEmailValue,
  validatePrintableText,
} from '../../../validation.js';

const invalid = (error) => ({ error, warning: '' });

export function validateEmail(document, capacity, limits) {
  const email = document.getElementById('email-to');
  const subject = document.getElementById('email-subject');
  const body = document.getElementById('email-body');
  const addressError = validateEmailValue(email.value, {
    label: lookup('fields.recipientEmail', 'recipient email address'),
  });
  if (addressError) return invalid(addressError);
  const subjectError = validatePrintableText(subject.value, {
    label: lookup(
      'validation.email.subjectLabel',
      'Not valid for Email format yet: subject',
    ),
    maxLength: limits.emailSubject,
  });
  if (subjectError) return invalid(subjectError);
  const bodyError = validatePrintableText(body.value, {
    label: lookup(
      'validation.email.bodyLabel',
      'Not valid for Email format yet: body',
    ),
    maxLength: Math.max(capacity.max, 0),
  });
  if (bodyError) return invalid(bodyError);
  return capacity.current > capacity.max
    ? invalid(
        lookup(
          'validation.email.capacity',
          'Not valid for Email format yet: body exceeds the current QR capacity ({current} / {max}).',
          {
            current: capacity.current,
            max: capacity.max,
          },
        ),
      )
    : { error: '', warning: '' };
}
