import { lookup } from '../../../../i18n/index.js';
import {
  getWebsiteValidationState,
  validateEmailValue,
  validateTelephoneValue,
  validateVCardTextValue,
} from '../../../data/validation.js';

const invalid = (error) => ({ error, warning: '' });

export function validateVCard(document) {
  const id = (name) => document.getElementById(name);
  for (const [name, options] of [
    [
      'vcard-name',
      { required: true, label: lookup('fields.fullName', 'full name') },
    ],
    ['vcard-org', { label: lookup('fields.organization', 'organization') }],
    ['vcard-title', { label: lookup('fields.title', 'title') }],
  ]) {
    const error = validateVCardTextValue(id(name).value, options);
    if (error) return invalid(error);
  }
  const phoneError = validateTelephoneValue(id('vcard-phone').value, {
    required: false,
    label: lookup('fields.vcardPhone', 'vCard phone number'),
    contextLabel: lookup('formats.vcard', 'vCard'),
  });
  if (phoneError) return invalid(phoneError);
  const emailError = validateEmailValue(id('vcard-email').value, {
    required: false,
    label: lookup('fields.vcardEmail', 'vCard email address'),
    contextLabel: lookup('formats.vcard', 'vCard'),
  });
  if (emailError) return invalid(emailError);
  return getWebsiteValidationState(id('vcard-url').value, {
    contextLabel: lookup('formats.vcard', 'vCard'),
  });
}
