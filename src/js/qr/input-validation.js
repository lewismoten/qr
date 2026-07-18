import { getDataCodewords } from './capacity.js';
import { createQrError } from './error.js';

const MAX_CONTENT_CHARACTERS = 7089;
const MAX_SEGMENTS = Math.floor((getDataCodewords(40, 'L') * 8) / 12);

export function assertContentLength(length) {
  if (length > MAX_CONTENT_CHARACTERS)
    throw createQrError(
      'tooLarge',
      'The content is too large for a version 40 QR Code.',
    );
}

export function assertSegmentCount(count) {
  if (count > MAX_SEGMENTS)
    throw createQrError(
      'tooLarge',
      'The content is too large for a version 40 QR Code.',
    );
}

export function assertVersion(version) {
  if (!Number.isInteger(version) || version < 1 || version > 40)
    throw createQrError(
      'versionRange',
      'QR version must be an integer from 1 through 40.',
      undefined,
      RangeError,
    );
}

export function getOwnOption(options, name, fallback) {
  return Object.hasOwn(options, name) ? options[name] : fallback;
}
