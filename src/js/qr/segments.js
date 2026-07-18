import { BitBuffer } from './bit-buffer.js';
import { getCountBitLength, getDataCodewords } from './capacity.js';
import { MODE_BITS } from './constants.js';
import { createQrError } from './error.js';
import { makeSegment } from './segment.js';
import { optimizeSegments } from './segment-optimizer.js';

export { optimizeSegments } from './segment-optimizer.js';

function normalizeSegments(payload) {
  return payload.map((part) =>
    makeSegment(
      part.data,
      typeof part.mode === 'string' ? part.mode : part.mode?.id,
    ),
  );
}

function getRequiredBits(segments, version) {
  let total = 0;
  for (const segment of segments) {
    const countBits = getCountBitLength(segment.mode, version);
    if (segment.characterCount >= 2 ** countBits) return Infinity;
    total += 4 + countBits + segment.bits.length;
  }
  return total;
}

function chooseVersion(segments, errorLevel, requestedVersion) {
  const fits = (version) =>
    getRequiredBits(segments, version) <=
    getDataCodewords(version, errorLevel) * 8;
  if (requestedVersion !== undefined) {
    if (
      !Number.isInteger(requestedVersion) ||
      requestedVersion < 1 ||
      requestedVersion > 40
    ) {
      throw createQrError(
        'versionRange',
        'QR version must be an integer from 1 through 40.',
        undefined,
        RangeError,
      );
    }
    if (fits(requestedVersion)) return requestedVersion;
  }
  for (let version = 1; version <= 40; version += 1) {
    if (fits(version)) {
      if (requestedVersion !== undefined) {
        throw createQrError(
          'minimumVersion',
          'The chosen QR Code version cannot contain this amount of data. Minimum version required is: {version}.',
          { version },
        );
      }
      return version;
    }
  }
  throw createQrError(
    'tooLarge',
    'The content is too large for a version 40 QR Code.',
  );
}

export function selectVersionAndSegments(
  payload,
  errorLevel,
  requestedVersion,
) {
  if (Array.isArray(payload)) {
    const segments = normalizeSegments(payload);
    return {
      segments,
      version: chooseVersion(segments, errorLevel, requestedVersion),
    };
  }

  const text = String(payload);
  const optimizedByBucket = new Map();
  const getOptimized = (version) => {
    const bucketVersion = version <= 9 ? 1 : version <= 26 ? 10 : 27;
    if (!optimizedByBucket.has(bucketVersion))
      optimizedByBucket.set(
        bucketVersion,
        optimizeSegments(text, bucketVersion),
      );
    return optimizedByBucket.get(bucketVersion);
  };
  const fits = (version, segments) =>
    getRequiredBits(segments, version) <=
    getDataCodewords(version, errorLevel) * 8;

  if (requestedVersion !== undefined) {
    if (
      !Number.isInteger(requestedVersion) ||
      requestedVersion < 1 ||
      requestedVersion > 40
    ) {
      throw createQrError(
        'versionRange',
        'QR version must be an integer from 1 through 40.',
        undefined,
        RangeError,
      );
    }
    const requestedSegments = getOptimized(requestedVersion);
    if (fits(requestedVersion, requestedSegments))
      return { segments: requestedSegments, version: requestedVersion };
  }

  for (let version = 1; version <= 40; version += 1) {
    const segments = getOptimized(version);
    if (!fits(version, segments)) continue;
    if (requestedVersion !== undefined) {
      throw createQrError(
        'minimumVersion',
        'The chosen QR Code version cannot contain this amount of data. Minimum version required is: {version}.',
        { version },
      );
    }
    return { segments, version };
  }
  throw createQrError(
    'tooLarge',
    'The content is too large for a version 40 QR Code.',
  );
}

export function makeDataCodewords(segments, version, errorLevel) {
  const capacity = getDataCodewords(version, errorLevel) * 8;
  const buffer = new BitBuffer();
  segments.forEach((segment) => {
    buffer.append(MODE_BITS[segment.mode], 4);
    buffer.append(
      segment.characterCount,
      getCountBitLength(segment.mode, version),
    );
    buffer.bits.push(...segment.bits);
  });
  buffer.append(0, Math.min(4, capacity - buffer.bits.length));
  while (buffer.bits.length % 8) buffer.bits.push(0);
  for (let pad = 0xec; buffer.bits.length < capacity; pad ^= 0xec ^ 0x11)
    buffer.append(pad, 8);

  const result = [];
  for (let index = 0; index < buffer.bits.length; index += 8) {
    result.push(
      Number.parseInt(buffer.bits.slice(index, index + 8).join(''), 2),
    );
  }
  return result;
}
