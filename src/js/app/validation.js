const VCARD_TEXT_PATTERN = /^[A-Za-z0-9 .,&()'/:+-]*$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PRINTABLE_TEXT_PATTERN = /^[\x20-\x7E]*$/;

export function validateEmailValue(value, { required = true, label = 'email address' } = {}) {
  const trimmed = value.trim();
  if (!trimmed) {
    return required ? `Not valid for Email format yet: ${label} is required.` : '';
  }

  if (!EMAIL_PATTERN.test(trimmed)) {
    return `Not valid for Email format yet: ${label} must be valid.`;
  }

  if (trimmed.length > 254) {
    return `Not valid for Email format yet: ${label} should stay within 254 characters.`;
  }

  return '';
}

export function validatePrintableText(value, { label, maxLength }) {
  const trimmedLength = value.length;
  if (trimmedLength > maxLength) {
    return `${label} should stay within ${maxLength} characters.`;
  }

  if (!PRINTABLE_TEXT_PATTERN.test(value)) {
    return `${label} can only use printable characters.`;
  }

  return '';
}

export function validateTelephoneValue(value, { required = true, label = 'telephone number' } = {}) {
  const trimmed = value.trim();
  if (!trimmed) {
    return required ? `Not valid for Phone format yet: ${label} is required.` : '';
  }

  const allowedPattern = /^\+?[\d\s().-]+$/;
  if (!allowedPattern.test(trimmed)) {
    return `Not valid for Phone format yet: ${label} can only use digits, spaces, parentheses, periods, hyphens, and an optional leading +.`;
  }

  const plusCount = [...trimmed].filter((character) => character === '+').length;
  if (plusCount > 1 || (plusCount === 1 && !trimmed.startsWith('+'))) {
    return `Not valid for Phone format yet: ${label} can only use + at the beginning.`;
  }

  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) {
    return `Not valid for Phone format yet: ${label} should contain a reasonable length of 10 to 15 digits.`;
  }

  return '';
}

export function validateGeoLabel(value) {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  if (trimmed.length > 80) {
    return 'Not valid for Geo format yet: label should stay within 80 characters.';
  }

  const allowedPattern = /^[A-Za-z0-9 .,&#()'/:+-]*$/;
  if (!allowedPattern.test(trimmed)) {
    return 'Not valid for Geo format yet: label can only use letters, numbers, spaces, and common punctuation.';
  }

  return '';
}

export function validateVCardTextValue(value, { required = false, label, maxLength = 80 } = {}) {
  const trimmed = value.trim();
  if (!trimmed) {
    return required ? `Not valid for vCard format yet: ${label} is required.` : '';
  }

  if (trimmed.length > maxLength) {
    return `Not valid for vCard format yet: ${label} should stay within ${maxLength} characters.`;
  }

  if (!VCARD_TEXT_PATTERN.test(trimmed)) {
    return `Not valid for vCard format yet: ${label} can only use letters, numbers, spaces, and common punctuation.`;
  }

  return '';
}

export function getWebsiteValidationState(value, { required = false, contextLabel = 'vCard' } = {}) {
  const trimmed = value.trim();
  if (!trimmed) {
    return {
      error: required ? `Not valid for ${contextLabel} format yet: website is required.` : '',
      warning: '',
    };
  }

  if (trimmed.length > 2048) {
    return {
      error: `Not valid for ${contextLabel} format yet: website should stay within 2048 characters.`,
      warning: '',
    };
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(trimmed);
  } catch (error) {
    return {
      error: `Not valid for ${contextLabel} format yet: website must include a full protocol such as https://.`,
      warning: '',
    };
  }

  if (!['https:', 'http:'].includes(parsedUrl.protocol)) {
    return {
      error: `Not valid for ${contextLabel} format yet: website should start with https:// or http://.`,
      warning: '',
    };
  }

  return {
    error: '',
    warning:
      parsedUrl.protocol === 'http:'
        ? `Warning for ${contextLabel} format: website uses http://. https:// is strongly recommended.`
        : '',
  };
}

export function validateCalendarText(value, { required = false, label, maxLength, multiline = false }) {
  const trimmed = value.trim();
  if (!trimmed) {
    return required ? `Not valid for Event format yet: ${label} is required.` : '';
  }
  if (value.length > maxLength) {
    return `Not valid for Event format yet: ${label} should stay within ${maxLength} characters.`;
  }

  const invalidControlPattern = multiline
    ? /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/
    : /[\x00-\x1f\x7f]/;
  if (invalidControlPattern.test(value)) {
    return `Not valid for Event format yet: ${label} contains unsupported control characters.`;
  }
  return '';
}

export function isValidBulkDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function isValidBulkTime(value) {
  if (!/^\d{2}:\d{2}$/.test(value)) {
    return false;
  }
  const [hour, minute] = value.split(':').map(Number);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}
