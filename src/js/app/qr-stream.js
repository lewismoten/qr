import { COUNT_BITS, getRawDataModules } from '@lewismoten/qr';
import { normalizeModeName } from './modes.js';

function getCharCountBits(mode, version) {
  const bucket = version <= 9 ? 0 : version <= 26 ? 1 : 2;
  return COUNT_BITS[mode]?.[bucket] ?? COUNT_BITS.byte[bucket];
}

export function classifyTraversalBits(
  qrDefinition,
  dataCodewordsCount,
  traversalLength,
) {
  const dataCapacityBits = dataCodewordsCount * 8;
  const totalCodewords = Math.floor(
    getRawDataModules(qrDefinition.version) / 8,
  );
  const totalCodewordBits = totalCodewords * 8;
  const roles = Array(traversalLength).fill('remainder');
  let cursor = 0;

  qrDefinition.segments.forEach((segment) => {
    const mode = normalizeModeName(segment.mode);

    for (let index = 0; index < 4 && cursor < dataCapacityBits; index += 1) {
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

  const terminatorBits = Math.min(4, Math.max(0, dataCapacityBits - cursor));
  for (
    let index = 0;
    index < terminatorBits && cursor < dataCapacityBits;
    index += 1
  ) {
    roles[cursor++] = 'terminator';
  }

  while (cursor < dataCapacityBits && cursor % 8 !== 0) {
    roles[cursor++] = 'bytePad';
  }

  while (cursor < dataCapacityBits) {
    for (let index = 0; index < 8 && cursor < dataCapacityBits; index += 1) {
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
  for (let index = 0; index < streamBitIndexes.length; index += 8) {
    const indexes = streamBitIndexes.slice(index, index + 8);
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

export function getEncodingUnitBitLengths(segment, mode) {
  const payloadBits = segment.getBitsLength();
  const dataLength =
    typeof segment.getLength === 'function' ? segment.getLength() : 0;
  const bitLengths = [];

  if (mode === 'numeric') {
    const completeGroups = Math.floor(dataLength / 3);
    bitLengths.push(...Array(completeGroups).fill(10));
    const remainingDigits = dataLength % 3;
    if (remainingDigits > 0) {
      bitLengths.push(remainingDigits === 1 ? 4 : 7);
    }
  } else if (mode === 'alphanumeric') {
    bitLengths.push(...Array(Math.floor(dataLength / 2)).fill(11));
    if (dataLength % 2 === 1) {
      bitLengths.push(6);
    }
  } else if (mode === 'kanji') {
    bitLengths.push(...Array(Math.floor(payloadBits / 13)).fill(13));
  } else if (mode === 'byte') {
    bitLengths.push(...Array(Math.floor(payloadBits / 8)).fill(8));
  }

  const describedBits = bitLengths.reduce(
    (total, bitLength) => total + bitLength,
    0,
  );
  if (describedBits < payloadBits) {
    bitLengths.push(payloadBits - describedBits);
  }

  return bitLengths;
}

export function buildEncodingUnitGroups(qrDefinition, traversal) {
  const groups = [];
  let cursor = 0;

  qrDefinition.segments.forEach((segment, segmentIndex) => {
    const mode = normalizeModeName(segment.mode);
    cursor += 4 + getCharCountBits(mode, qrDefinition.version);
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
