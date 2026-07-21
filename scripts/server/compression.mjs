import { constants, createBrotliCompress, createGzip } from 'node:zlib';

import {
  MEDIA_TYPE_JAVASCRIPT,
  MEDIA_TYPE_JSON,
  MEDIA_TYPE_XML,
} from '../../src/js/app/media-types.js';

const COMPRESSIBLE_TYPES = [
  MEDIA_TYPE_JAVASCRIPT,
  MEDIA_TYPE_JSON,
  MEDIA_TYPE_XML,
  'image/svg+xml',
  'text/',
];

function quality(value) {
  const match = value.match(/;\s*q=([\d.]+)/i);
  return match ? Math.max(0, Math.min(1, Number(match[1]) || 0)) : 1;
}

export function selectContentEncoding(header = '') {
  const accepted = new Map(
    header
      .toLowerCase()
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
      .map((value) => [value.split(';')[0], quality(value)]),
  );
  const wildcard = accepted.get('*') ?? 0;
  const choices = ['br', 'gzip']
    .map((name) => ({ name, quality: accepted.get(name) ?? wildcard }))
    .filter((choice) => choice.quality > 0)
    .sort((left, right) => right.quality - left.quality);
  return choices[0]?.name ?? null;
}

export function shouldCompress(contentType, size) {
  return (
    size >= 256 &&
    COMPRESSIBLE_TYPES.some((value) => contentType.startsWith(value))
  );
}

export function createContentEncoder(encoding) {
  if (encoding === 'br') {
    return createBrotliCompress({
      params: { [constants.BROTLI_PARAM_QUALITY]: 4 },
    });
  }
  if (encoding === 'gzip') return createGzip({ level: 6 });
  return null;
}
