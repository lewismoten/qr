import { COUNT_BITS, getRawDataModules } from '@lewismoten/qr';
import { normalizeModeName } from '../modes.js';
import { getEncodingUnitBitLengths } from './encoding-units.js';

export { getEncodingUnitBitLengths } from './encoding-units.js';

const SMALL_VERSION_MAXIMUM = 9;
const MEDIUM_VERSION_MAXIMUM = 26;
const BITS_PER_BYTE = 8;
const MODE_INDICATOR_BITS = 4;
const TERMINATOR_MAXIMUM_BITS = 4;

function getCharCountBits(mode, version) {
  const bucket =
    version <= SMALL_VERSION_MAXIMUM
      ? 0
      : version <= MEDIUM_VERSION_MAXIMUM
        ? 1
        : 2;
  return COUNT_BITS[mode]?.[bucket] ?? COUNT_BITS.byte[bucket];
}

export function classifyTraversalBits(
  qrDefinition,
  dataCodewordsCount,
  traversalLength,
) {
  const dataCapacityBits = dataCodewordsCount * BITS_PER_BYTE;
  const totalCodewords = Math.floor(
    getRawDataModules(qrDefinition.version) / BITS_PER_BYTE,
  );
  const totalCodewordBits = totalCodewords * BITS_PER_BYTE;
  const roles = Array(traversalLength).fill('remainder');
  let cursor = 0;

  qrDefinition.segments.forEach((segment) => {
    const mode = normalizeModeName(segment.mode);

    for (
      let index = 0;
      index < MODE_INDICATOR_BITS && cursor < dataCapacityBits;
      index += 1
    ) {
      roles[cursor++] = 'mode';
    }

    const charCountBits = getCharCountBits(mode, qrDefinition.version);
    for (
      let index = 0;
      index < charCountBits && cursor < dataCapacityBits;
      index += 1
    ) {
      roles[cursor++] = 'charCount';
    }

    const payloadBits = segment.getBitsLength();
    for (
      let index = 0;
      index < payloadBits && cursor < dataCapacityBits;
      index += 1
    ) {
      roles[cursor++] = 'payload';
    }
  });

  const terminatorBits = Math.min(
    TERMINATOR_MAXIMUM_BITS,
    Math.max(0, dataCapacityBits - cursor),
  );
  for (
    let index = 0;
    index < terminatorBits && cursor < dataCapacityBits;
    index += 1
  ) {
    roles[cursor++] = 'terminator';
  }

  while (cursor < dataCapacityBits && cursor % BITS_PER_BYTE !== 0) {
    roles[cursor++] = 'bytePad';
  }

  while (cursor < dataCapacityBits) {
    for (
      let index = 0;
      index < BITS_PER_BYTE && cursor < dataCapacityBits;
      index += 1
    ) {
      roles[cursor++] = 'padByte';
    }
  }

  for (
    let index = dataCapacityBits;
    index < Math.min(totalCodewordBits, traversalLength);
    index += 1
  ) {
    roles[index] = 'errorCorrection';
  }

  return roles;
}

export function summarizeCodewordRoles(roles) {
  if (roles.every((role) => role === 'errorCorrection')) {
    return 'errorCorrection';
  }
  if (roles.every((role) => role === 'remainder')) {
    return 'remainder';
  }
  if (roles.every((role) => role === 'padByte')) {
    return 'padByte';
  }
  if (roles.some((role) => role === 'mode' || role === 'charCount')) {
    return 'header';
  }
  if (
    roles.some(
      (role) =>
        role === 'terminator' || role === 'bytePad' || role === 'padByte',
    )
  ) {
    return 'padding';
  }
  return 'data';
}

export function summarizeGroupRoles(roles) {
  if (roles.every((role) => role === 'errorCorrection')) {
    return 'errorCorrection';
  }
  if (roles.every((role) => role === 'remainder')) {
    return 'remainder';
  }
  if (roles.every((role) => role === 'padByte' || role === 'bytePad')) {
    return 'padByte';
  }
  if (roles.every((role) => role === 'terminator')) {
    return 'terminator';
  }
  if (
    roles.some(
      (role) =>
        role === 'terminator' || role === 'bytePad' || role === 'padByte',
    )
  ) {
    return 'padding';
  }
  if (roles.some((role) => role === 'mode' || role === 'charCount')) {
    return 'header';
  }
  return 'data';
}

export function buildPostHeaderStreamGroups(traversal, bitRoles) {
  const streamBitIndexes = [];

  bitRoles.forEach((role, index) => {
    if (
      role === 'payload' ||
      role === 'terminator' ||
      role === 'bytePad' ||
      role === 'padByte'
    ) {
      streamBitIndexes.push(index);
    }
  });

  const groups = [];
  for (let index = 0; index < streamBitIndexes.length; index += BITS_PER_BYTE) {
    const indexes = streamBitIndexes.slice(index, index + BITS_PER_BYTE);
    const modules = indexes.map((bitIndex) => traversal[bitIndex]);
    const roles = indexes.map((bitIndex) => bitRoles[bitIndex]);

    groups.push({
      kind: summarizeGroupRoles(roles),
      modules,
      roles,
    });
  }

  return groups;
}

export function buildEncodingUnitGroups(qrDefinition, traversal) {
  const groups = [];
  let cursor = 0;

  qrDefinition.segments.forEach((segment, segmentIndex) => {
    const mode = normalizeModeName(segment.mode);
    cursor +=
      MODE_INDICATOR_BITS + getCharCountBits(mode, qrDefinition.version);
    let segmentBitOffset = 0;

    getEncodingUnitBitLengths(segment, mode).forEach((bitLength, unitIndex) => {
      const start = cursor + segmentBitOffset;
      const modules = traversal.slice(start, start + bitLength);
      if (modules.length > 0) {
        groups.push({
          kind: 'data',
          modules,
          roles: Array(modules.length).fill('payload'),
          encodingMode: mode,
          segmentIndex,
          unitIndex,
        });
      }
      segmentBitOffset += bitLength;
    });

    cursor += segment.getBitsLength();
  });

  return groups;
}
