import { BitBuffer } from './bit-buffer.js';
import { getCountBitLength, getDataCodewords } from './capacity.js';
import { ALPHANUMERIC, MODE_BITS } from './constants.js';
import { getQrKanjiValue } from './kanji.js';
import { createQrError } from './error.js';

const textEncoder = new TextEncoder();

function detectMode(text) {
  if (/^[0-9]+$/.test(text)) return 'numeric';
  if ([...text].every((character) => ALPHANUMERIC.includes(character))) return 'alphanumeric';
  return 'byte';
}

function makeSegment(data, requestedMode) {
  const text = String(data);
  const mode = requestedMode || detectMode(text);
  if (!MODE_BITS[mode]) throw createQrError('modeUnsupported', 'Native QR mode is not supported yet: {mode}.', { mode });
  if (mode === 'numeric' && !/^[0-9]*$/.test(text)) throw createQrError('numericCharacters', 'Numeric mode only accepts digits 0-9.');
  if (mode === 'alphanumeric' && ![...text].every((character) => ALPHANUMERIC.includes(character))) {
    throw createQrError('alphanumericCharacters', 'Alphanumeric mode contains unsupported characters.');
  }
  if (mode === 'kanji' && ![...text].every((character) => getQrKanjiValue(character) !== null)) {
    throw createQrError('kanjiCharacters', 'Kanji mode contains characters outside the QR Shift JIS ranges.');
  }

  const payload = new BitBuffer();
  let count;
  if (mode === 'numeric') {
    count = text.length;
    for (let index = 0; index < text.length; index += 3) {
      const part = text.slice(index, index + 3);
      payload.append(Number.parseInt(part, 10), part.length * 3 + 1);
    }
  } else if (mode === 'alphanumeric') {
    count = text.length;
    for (let index = 0; index + 1 < text.length; index += 2) {
      payload.append(ALPHANUMERIC.indexOf(text[index]) * 45 + ALPHANUMERIC.indexOf(text[index + 1]), 11);
    }
    if (text.length % 2) payload.append(ALPHANUMERIC.indexOf(text.at(-1)), 6);
  } else if (mode === 'byte') {
    const bytes = textEncoder.encode(text);
    count = bytes.length;
    bytes.forEach((byte) => payload.append(byte, 8));
  } else {
    const characters = [...text];
    count = characters.length;
    characters.forEach((character) => payload.append(getQrKanjiValue(character), 13));
  }

  return {
    data: text,
    mode,
    characterCount: count,
    bits: payload.bits,
    getBitsLength() {
      return this.bits.length;
    },
    getLength() {
      return this.characterCount;
    },
  };
}

function normalizeSegments(payload) {
  if (Array.isArray(payload)) {
    return payload.map((part) => makeSegment(part.data, typeof part.mode === 'string' ? part.mode : part.mode?.id));
  }
  return [makeSegment(payload)];
}

function getCharacterModes(character) {
  const modes = [];
  if (/^[0-9]$/.test(character)) modes.push('numeric');
  if (ALPHANUMERIC.includes(character)) modes.push('alphanumeric');
  modes.push('byte');
  return modes;
}

function getModeUnitCount(mode, character) {
  return mode === 'byte' ? textEncoder.encode(character).length : 1;
}

function getIncrementalPayloadBits(mode, previousCount, unitCount) {
  if (mode === 'numeric') return previousCount % 3 === 0 ? 4 : 3;
  if (mode === 'alphanumeric') return previousCount % 2 === 0 ? 6 : 5;
  if (mode === 'kanji') return 13;
  return unitCount * 8;
}

function getOptimizationKey(mode, count) {
  if (mode === 'numeric') return `${mode}:${count % 3}`;
  if (mode === 'alphanumeric') return `${mode}:${count % 2}`;
  return mode;
}

export function optimizeSegments(text, version) {
  const characters = [...String(text)];
  if (!characters.length) return [makeSegment('', 'byte')];
  let states = [];

  characters.forEach((character) => {
    const nextStates = new Map();
    const availableModes = getCharacterModes(character);
    const previousStates = states.length ? states : [null];
    previousStates.forEach((previous) => {
      availableModes.forEach((mode) => {
        const unitCount = getModeUnitCount(mode, character);
        const countBits = getCountBitLength(mode, version);
        const maximumCount = 2 ** countBits - 1;
        const candidates = [{ continuing: false, previousCount: 0 }];
        if (previous?.mode === mode && previous.segmentCount + unitCount <= maximumCount) {
          candidates.push({ continuing: true, previousCount: previous.segmentCount });
        }

        candidates.forEach(({ continuing, previousCount }) => {
          const segmentCount = previousCount + unitCount;
          const cost = (previous?.cost || 0) +
            (continuing ? 0 : 4 + countBits) +
            getIncrementalPayloadBits(mode, previousCount, unitCount);
          const key = getOptimizationKey(mode, segmentCount);
          const existing = nextStates.get(key);
          const prefersSpecializedBoundary = existing && cost === existing.cost && !continuing && !existing.startsSegment;
          if (!existing || cost < existing.cost || prefersSpecializedBoundary) {
            nextStates.set(key, {
              cost,
              mode,
              segmentCount,
              character,
              startsSegment: !continuing,
              previous,
            });
          }
        });
      });
    });
    states = [...nextStates.values()];
  });

  const modePreference = { numeric: 0, alphanumeric: 1, kanji: 2, byte: 3 };
  let current = states.reduce((best, state) =>
    !best || state.cost < best.cost ||
    (state.cost === best.cost && modePreference[state.mode] < modePreference[best.mode])
      ? state
      : best,
  null);
  const encodedCharacters = [];
  while (current) {
    encodedCharacters.push(current);
    current = current.previous;
  }
  encodedCharacters.reverse();

  const optimized = [];
  encodedCharacters.forEach(({ character, mode, startsSegment }) => {
    if (startsSegment || !optimized.length) optimized.push({ mode, data: character });
    else optimized.at(-1).data += character;
  });
  return optimized.map(({ data, mode }) => makeSegment(data, mode));
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
  const fits = (version) => getRequiredBits(segments, version) <= getDataCodewords(version, errorLevel) * 8;
  if (requestedVersion !== undefined) {
    if (!Number.isInteger(requestedVersion) || requestedVersion < 1 || requestedVersion > 40) {
      throw createQrError('versionRange', 'QR version must be an integer from 1 through 40.', undefined, RangeError);
    }
    if (fits(requestedVersion)) return requestedVersion;
  }
  for (let version = 1; version <= 40; version += 1) {
    if (fits(version)) {
      if (requestedVersion !== undefined) {
        throw createQrError('minimumVersion', 'The chosen QR Code version cannot contain this amount of data. Minimum version required is: {version}.', { version });
      }
      return version;
    }
  }
  throw createQrError('tooLarge', 'The content is too large for a version 40 QR Code.');
}

export function selectVersionAndSegments(payload, errorLevel, requestedVersion) {
  if (Array.isArray(payload)) {
    const segments = normalizeSegments(payload);
    return { segments, version: chooseVersion(segments, errorLevel, requestedVersion) };
  }

  const text = String(payload);
  const optimizedByBucket = new Map();
  const getOptimized = (version) => {
    const bucketVersion = version <= 9 ? 1 : version <= 26 ? 10 : 27;
    if (!optimizedByBucket.has(bucketVersion)) optimizedByBucket.set(bucketVersion, optimizeSegments(text, bucketVersion));
    return optimizedByBucket.get(bucketVersion);
  };
  const fits = (version, segments) => getRequiredBits(segments, version) <= getDataCodewords(version, errorLevel) * 8;

  if (requestedVersion !== undefined) {
    if (!Number.isInteger(requestedVersion) || requestedVersion < 1 || requestedVersion > 40) {
      throw createQrError('versionRange', 'QR version must be an integer from 1 through 40.', undefined, RangeError);
    }
    const requestedSegments = getOptimized(requestedVersion);
    if (fits(requestedVersion, requestedSegments)) return { segments: requestedSegments, version: requestedVersion };
  }

  for (let version = 1; version <= 40; version += 1) {
    const segments = getOptimized(version);
    if (!fits(version, segments)) continue;
    if (requestedVersion !== undefined) {
      throw createQrError('minimumVersion', 'The chosen QR Code version cannot contain this amount of data. Minimum version required is: {version}.', { version });
    }
    return { segments, version };
  }
  throw createQrError('tooLarge', 'The content is too large for a version 40 QR Code.');
}

export function makeDataCodewords(segments, version, errorLevel) {
  const capacity = getDataCodewords(version, errorLevel) * 8;
  const buffer = new BitBuffer();
  segments.forEach((segment) => {
    buffer.append(MODE_BITS[segment.mode], 4);
    buffer.append(segment.characterCount, getCountBitLength(segment.mode, version));
    buffer.bits.push(...segment.bits);
  });
  buffer.append(0, Math.min(4, capacity - buffer.bits.length));
  while (buffer.bits.length % 8) buffer.bits.push(0);
  for (let pad = 0xec; buffer.bits.length < capacity; pad ^= 0xec ^ 0x11) buffer.append(pad, 8);

  const result = [];
  for (let index = 0; index < buffer.bits.length; index += 8) {
    result.push(Number.parseInt(buffer.bits.slice(index, index + 8).join(''), 2));
  }
  return result;
}
