import { COUNT_BITS, getRawDataModules } from '@lewismoten/qr';
import { normalizeModeName } from '../modes.js';
import { getEncodingUnitBitLengths } from './encoding-units.js';

export { getEncodingUnitBitLengths } from './encoding-units.js';

const SMALL_VERSION_MAXIMUM = 9;
const MEDIUM_VERSION_MAXIMUM = 26;
const BITS_PER_BYTE = 8;
const MODE_INDICATOR_BITS = 4;
const TERMINATOR_MAXIMUM_BITS = 4;

export const QR_STREAM_ROLE = Object.freeze({
  mode: 'mode',
  characterCount: 'charCount',
  payload: 'payload',
  terminator: 'terminator',
  byteAlignment: 'bytePad',
  paddingCodeword: 'padByte',
  errorCorrection: 'errorCorrection',
  remainder: 'remainder',
});

export const QR_STREAM_GROUP = Object.freeze({
  data: 'data',
  header: 'header',
  padding: 'padding',
});

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
  const roles = Array(traversalLength).fill(QR_STREAM_ROLE.remainder);
  let cursor = 0;

  qrDefinition.segments.forEach((segment) => {
    const mode = normalizeModeName(segment.mode);

    for (
      let index = 0;
      index < MODE_INDICATOR_BITS && cursor < dataCapacityBits;
      index += 1
    ) {
      roles[cursor++] = QR_STREAM_ROLE.mode;
    }

    const charCountBits = getCharCountBits(mode, qrDefinition.version);
    for (
      let index = 0;
      index < charCountBits && cursor < dataCapacityBits;
      index += 1
    ) {
      roles[cursor++] = QR_STREAM_ROLE.characterCount;
    }

    const payloadBits = segment.getBitsLength();
    for (
      let index = 0;
      index < payloadBits && cursor < dataCapacityBits;
      index += 1
    ) {
      roles[cursor++] = QR_STREAM_ROLE.payload;
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
    roles[cursor++] = QR_STREAM_ROLE.terminator;
  }

  while (cursor < dataCapacityBits && cursor % BITS_PER_BYTE !== 0) {
    roles[cursor++] = QR_STREAM_ROLE.byteAlignment;
  }

  while (cursor < dataCapacityBits) {
    for (
      let index = 0;
      index < BITS_PER_BYTE && cursor < dataCapacityBits;
      index += 1
    ) {
      roles[cursor++] = QR_STREAM_ROLE.paddingCodeword;
    }
  }

  for (
    let index = dataCapacityBits;
    index < Math.min(totalCodewordBits, traversalLength);
    index += 1
  ) {
    roles[index] = QR_STREAM_ROLE.errorCorrection;
  }

  return roles;
}

export function summarizeCodewordRoles(roles) {
  if (roles.every((role) => role === QR_STREAM_ROLE.errorCorrection)) {
    return QR_STREAM_ROLE.errorCorrection;
  }
  if (roles.every((role) => role === QR_STREAM_ROLE.remainder)) {
    return QR_STREAM_ROLE.remainder;
  }
  if (roles.every((role) => role === QR_STREAM_ROLE.paddingCodeword)) {
    return QR_STREAM_ROLE.paddingCodeword;
  }
  if (
    roles.some(
      (role) =>
        role === QR_STREAM_ROLE.mode || role === QR_STREAM_ROLE.characterCount,
    )
  ) {
    return QR_STREAM_GROUP.header;
  }
  if (
    roles.some(
      (role) =>
        role === QR_STREAM_ROLE.terminator ||
        role === QR_STREAM_ROLE.byteAlignment ||
        role === QR_STREAM_ROLE.paddingCodeword,
    )
  ) {
    return QR_STREAM_GROUP.padding;
  }
  return QR_STREAM_GROUP.data;
}

export function summarizeGroupRoles(roles) {
  if (roles.every((role) => role === QR_STREAM_ROLE.errorCorrection)) {
    return QR_STREAM_ROLE.errorCorrection;
  }
  if (roles.every((role) => role === QR_STREAM_ROLE.remainder)) {
    return QR_STREAM_ROLE.remainder;
  }
  if (
    roles.every(
      (role) =>
        role === QR_STREAM_ROLE.paddingCodeword ||
        role === QR_STREAM_ROLE.byteAlignment,
    )
  ) {
    return QR_STREAM_ROLE.paddingCodeword;
  }
  if (roles.every((role) => role === QR_STREAM_ROLE.terminator)) {
    return QR_STREAM_ROLE.terminator;
  }
  if (
    roles.some(
      (role) =>
        role === QR_STREAM_ROLE.terminator ||
        role === QR_STREAM_ROLE.byteAlignment ||
        role === QR_STREAM_ROLE.paddingCodeword,
    )
  ) {
    return QR_STREAM_GROUP.padding;
  }
  if (
    roles.some(
      (role) =>
        role === QR_STREAM_ROLE.mode || role === QR_STREAM_ROLE.characterCount,
    )
  ) {
    return QR_STREAM_GROUP.header;
  }
  return QR_STREAM_GROUP.data;
}

export function buildPostHeaderStreamGroups(traversal, bitRoles) {
  const streamBitIndexes = [];

  bitRoles.forEach((role, index) => {
    if (
      role === QR_STREAM_ROLE.payload ||
      role === QR_STREAM_ROLE.terminator ||
      role === QR_STREAM_ROLE.byteAlignment ||
      role === QR_STREAM_ROLE.paddingCodeword
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
          kind: QR_STREAM_GROUP.data,
          modules,
          roles: Array(modules.length).fill(QR_STREAM_ROLE.payload),
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
