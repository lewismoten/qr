import { lookup } from '../../i18n/index.js';

const MAXIMUM_PHONE_FORMAT_LENGTH = 40;
const MINIMUM_PHONE_DIGITS = 10;
const MAXIMUM_PHONE_DIGITS = 15;

export function validateTelephoneValue(
  value,
  { required = true, label, contextLabel } = {},
) {
  const resolvedLabel =
    label ?? lookup('fields.telephoneNumber', 'telephone number');
  const resolvedContext = contextLabel ?? lookup('formats.phone', 'Phone');
  const trimmed = value.trim();
  if (!trimmed) {
    return required
      ? lookup(
          'validation.phone.required',
          'Not valid for {context} format yet: {label} is required.',
          { context: resolvedContext, label: resolvedLabel },
        )
      : '';
  }

  const allowedPattern = /^[+\d\s().-]+$/;
  if (!allowedPattern.test(trimmed)) {
    return lookup(
      'validation.phone.characters',
      'Not valid for {context} format yet: {label} can only use digits, spaces, parentheses, periods, hyphens, and an optional leading +.',
      { context: resolvedContext, label: resolvedLabel },
    );
  }

  if (trimmed.length > MAXIMUM_PHONE_FORMAT_LENGTH) {
    return lookup(
      'validation.phone.formatLength',
      'Not valid for {context} format yet: {label} should stay within 40 characters.',
      { context: resolvedContext, label: resolvedLabel },
    );
  }

  const plusCount = [...trimmed].filter(
    (character) => character === '+',
  ).length;
  if (plusCount > 1 || (plusCount === 1 && !trimmed.startsWith('+'))) {
    return lookup(
      'validation.phone.plus',
      'Not valid for {context} format yet: {label} can only use + at the beginning.',
      { context: resolvedContext, label: resolvedLabel },
    );
  }

  const digits = trimmed.replace(/\D/g, '');
  if (
    digits.length < MINIMUM_PHONE_DIGITS ||
    digits.length > MAXIMUM_PHONE_DIGITS
  ) {
    return lookup(
      'validation.phone.length',
      'Not valid for {context} format yet: {label} should contain a reasonable length of 10 to 15 digits.',
      { context: resolvedContext, label: resolvedLabel },
    );
  }

  return '';
}
