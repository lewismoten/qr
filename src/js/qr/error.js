import { createLocalizedError } from '../localized-error.js';

export function createQrError(key, message, options, ErrorType = Error) {
  return createLocalizedError(`qr.errors.${key}`, message, options, ErrorType);
}
