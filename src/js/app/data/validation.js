import { lookup } from '../../i18n/index.js';
export { validateTelephoneValue } from './telephone-validation.js';

const VCARD_TEXT_PATTERN = /^[\p{L}\p{M}\p{N}\p{P}\p{S}\p{Zs}]*$/u;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PRINTABLE_TEXT_PATTERN = /^[^\p{Cc}\p{Cs}]*$/u;
const MAXIMUM_EMAIL_LENGTH = 254;
const MAXIMUM_GEO_LABEL_LENGTH = 80;
const MAXIMUM_URL_LENGTH = 2048;
const MAXIMUM_HOUR = 23;
const MAXIMUM_MINUTE = 59;

export function validateEmailValue(
  value,
  { required = true, label, contextLabel } = {},
) {
  const resolvedLabel = label ?? lookup('fields.emailAddress', 'email address');
  const resolvedContext = contextLabel ?? lookup('formats.email', 'Email');
  const trimmed = value.trim();
  if (!trimmed) {
    return required
      ? lookup(
          'validation.email.required',
          'Not valid for {context} format yet: {label} is required.',
          { context: resolvedContext, label: resolvedLabel },
        )
      : '';
  }

  if (!PRINTABLE_TEXT_PATTERN.test(trimmed) || !EMAIL_PATTERN.test(trimmed)) {
    return lookup(
      'validation.email.invalid',
      'Not valid for {context} format yet: {label} must be valid.',
      { context: resolvedContext, label: resolvedLabel },
    );
  }

  if (trimmed.length > MAXIMUM_EMAIL_LENGTH) {
    return lookup(
      'validation.email.length',
      'Not valid for {context} format yet: {label} should stay within {maxLength} characters.',
      {
        context: resolvedContext,
        label: resolvedLabel,
        maxLength: MAXIMUM_EMAIL_LENGTH,
      },
    );
  }

  return '';
}

export function validatePrintableText(value, { label, maxLength }) {
  const trimmedLength = value.length;
  if (trimmedLength > maxLength) {
    return lookup(
      'validation.text.length',
      '{label} should stay within {maxLength} characters.',
      { label, maxLength },
    );
  }

  if (!PRINTABLE_TEXT_PATTERN.test(value)) {
    return lookup(
      'validation.text.printable',
      '{label} can only use printable characters.',
      { label },
    );
  }

  return '';
}

export function validateGeoLabel(value) {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  if (trimmed.length > MAXIMUM_GEO_LABEL_LENGTH) {
    return lookup(
      'validation.geo.labelLength',
      'Not valid for Geo format yet: label should stay within {maxLength} characters.',
      { maxLength: MAXIMUM_GEO_LABEL_LENGTH },
    );
  }

  const allowedPattern = /^[\p{L}\p{M}\p{N}\p{P}\p{S}\p{Zs}]*$/u;
  if (!allowedPattern.test(trimmed)) {
    return lookup(
      'validation.geo.labelCharacters',
      'Not valid for Geo format yet: label can only use letters, numbers, spaces, and common punctuation.',
    );
  }

  return '';
}

export function validateVCardTextValue(
  value,
  { required = false, label, maxLength = 80 } = {},
) {
  const trimmed = value.trim();
  if (!trimmed) {
    return required
      ? lookup(
          'validation.vcard.required',
          'Not valid for vCard format yet: {label} is required.',
          { label },
        )
      : '';
  }

  if (trimmed.length > maxLength) {
    return lookup(
      'validation.vcard.length',
      'Not valid for vCard format yet: {label} should stay within {maxLength} characters.',
      { label, maxLength },
    );
  }

  if (!VCARD_TEXT_PATTERN.test(trimmed)) {
    return lookup(
      'validation.vcard.characters',
      'Not valid for vCard format yet: {label} can only use letters, numbers, spaces, and common punctuation.',
      { label },
    );
  }

  return '';
}

export function getWebsiteValidationState(
  value,
  { required = false, contextLabel } = {},
) {
  const resolvedContext = contextLabel ?? lookup('formats.vcard', 'vCard');
  const trimmed = value.trim();
  if (!trimmed) {
    return {
      error: required
        ? lookup(
            'validation.website.required',
            'Not valid for {context} format yet: website is required.',
            { context: resolvedContext },
          )
        : '',
      warning: '',
    };
  }

  if (trimmed.length > MAXIMUM_URL_LENGTH) {
    return {
      error: lookup(
        'validation.website.length',
        'Not valid for {context} format yet: website should stay within {maxLength} characters.',
        { context: resolvedContext, maxLength: MAXIMUM_URL_LENGTH },
      ),
      warning: '',
    };
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(trimmed);
  } catch {
    return {
      error: lookup(
        'validation.website.protocolRequired',
        'Not valid for {context} format yet: website must include a full protocol such as https://.',
        { context: resolvedContext },
      ),
      warning: '',
    };
  }

  if (!['https:', 'http:'].includes(parsedUrl.protocol)) {
    return {
      error: lookup(
        'validation.website.protocol',
        'Not valid for {context} format yet: website should start with https:// or http://.',
        { context: resolvedContext },
      ),
      warning: '',
    };
  }

  return {
    error: '',
    warning:
      parsedUrl.protocol === 'http:'
        ? lookup(
            'validation.website.insecure',
            'Warning for {context} format: website uses http://. https:// is strongly recommended.',
            { context: resolvedContext },
          )
        : '',
  };
}

export function validateCalendarText(
  value,
  { required = false, label, maxLength, multiline = false },
) {
  const trimmed = value.trim();
  if (!trimmed) {
    return required
      ? lookup(
          'validation.event.required',
          'Not valid for Event format yet: {label} is required.',
          { label },
        )
      : '';
  }
  if (value.length > maxLength) {
    return lookup(
      'validation.event.length',
      'Not valid for Event format yet: {label} should stay within {maxLength} characters.',
      { label, maxLength },
    );
  }

  const invalidControlPattern = multiline
    ? // These ranges intentionally identify non-printing control characters.
      // eslint-disable-next-line no-control-regex
      /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/
    : // eslint-disable-next-line no-control-regex
      /[\x00-\x1f\x7f]/;
  if (invalidControlPattern.test(value)) {
    return lookup(
      'validation.event.characters',
      'Not valid for Event format yet: {label} contains unsupported control characters.',
      { label },
    );
  }
  return '';
}

export function isValidBulkDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function isValidBulkTime(value) {
  if (!/^\d{2}:\d{2}$/.test(value)) {
    return false;
  }
  const [hour, minute] = value.split(':').map(Number);
  return (
    hour >= 0 && hour <= MAXIMUM_HOUR && minute >= 0 && minute <= MAXIMUM_MINUTE
  );
}
