import { lookup } from '../../../i18n/index.js';

export function validateUrl(value) {
  const context = lookup('formats.url', 'URL');
  const trimmed = value.trim();
  if (!trimmed) {
    return {
      error: lookup(
        'validation.website.required',
        'Not valid for {context} format yet: website is required.',
        { context },
      ),
      warning: '',
    };
  }
  if (trimmed.length > 2048) {
    return {
      error: lookup(
        'validation.website.length',
        'Not valid for {context} format yet: website should stay within 2048 characters.',
        { context },
      ),
      warning: '',
    };
  }
  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return {
      error: lookup(
        'validation.website.protocolRequired',
        'Not valid for {context} format yet: website must include a full protocol such as https://.',
        { context },
      ),
      warning: '',
    };
  }
  if (!['https:', 'http:'].includes(parsed.protocol)) {
    return {
      error: lookup(
        'validation.website.protocol',
        'Not valid for {context} format yet: website should start with https:// or http://.',
        { context },
      ),
      warning: '',
    };
  }
  return {
    error: '',
    warning:
      parsed.protocol === 'http:'
        ? lookup(
            'validation.website.insecure',
            'Warning for {context} format: website uses http://. https:// is strongly recommended.',
            { context },
          )
        : '',
  };
}
