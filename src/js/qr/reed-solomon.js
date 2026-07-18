import {
  ECC_CODEWORDS_PER_BLOCK,
  NUM_ERROR_CORRECTION_BLOCKS,
} from './constants.js';
import { getRawDataModules } from './capacity.js';

const divisorCache = new Map();
const divisorLogarithmCache = new WeakMap();
const fieldExponents = new Uint8Array(512);
const fieldLogarithms = new Uint8Array(256);

let fieldValue = 1;
for (let exponent = 0; exponent < 255; exponent += 1) {
  fieldExponents[exponent] = fieldValue;
  fieldLogarithms[fieldValue] = exponent;
  fieldValue <<= 1;
  if (fieldValue & 0x100) fieldValue ^= 0x11d;
}
for (let exponent = 255; exponent < fieldExponents.length; exponent += 1)
  fieldExponents[exponent] = fieldExponents[exponent - 255];

function multiply(x, y) {
  if (x === 0 || y === 0) return 0;
  return fieldExponents[fieldLogarithms[x] + fieldLogarithms[y]];
}

export function makeReedSolomonDivisor(degree) {
  if (divisorCache.has(degree)) return divisorCache.get(degree);

  const result = Array(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;
  for (let index = 0; index < degree; index += 1) {
    for (let coefficient = 0; coefficient < degree; coefficient += 1) {
      result[coefficient] = multiply(result[coefficient], root);
      if (coefficient + 1 < degree)
        result[coefficient] ^= result[coefficient + 1];
    }
    root = multiply(root, 2);
  }
  const divisor = Object.freeze(result);
  divisorCache.set(degree, divisor);
  divisorLogarithmCache.set(
    divisor,
    Uint8Array.from(divisor, (value) => fieldLogarithms[value]),
  );
  return divisor;
}

export function getReedSolomonRemainder(data, divisor) {
  const result = new Uint8Array(divisor.length);
  const divisorLogarithms = divisorLogarithmCache.get(divisor);
  const last = result.length - 1;
  for (const byte of data) {
    const factor = byte ^ result[0];
    if (factor === 0) {
      result.copyWithin(0, 1);
      result[last] = 0;
      continue;
    }
    const factorLogarithm = fieldLogarithms[factor];
    for (let index = 0; index < last; index += 1) {
      const product =
        fieldExponents[divisorLogarithms[index] + factorLogarithm];
      result[index] = result[index + 1] ^ product;
    }
    result[last] = fieldExponents[divisorLogarithms[last] + factorLogarithm];
  }
  return result;
}

export function addErrorCorrection(data, version, errorLevel) {
  const blockCount = NUM_ERROR_CORRECTION_BLOCKS[errorLevel][version];
  const eccLength = ECC_CODEWORDS_PER_BLOCK[errorLevel][version];
  const rawCodewords = Math.floor(getRawDataModules(version) / 8);
  const shortBlockCount = blockCount - (rawCodewords % blockCount);
  const shortBlockLength = Math.floor(rawCodewords / blockCount);
  const shortDataLength = shortBlockLength - eccLength;
  const divisor = makeReedSolomonDivisor(eccLength);
  const blocks = [];
  let cursor = 0;

  for (let block = 0; block < blockCount; block += 1) {
    const dataLength = shortDataLength + (block < shortBlockCount ? 0 : 1);
    const blockData = data.slice(cursor, cursor + dataLength);
    cursor += dataLength;
    blocks.push({
      data: blockData,
      ecc: getReedSolomonRemainder(blockData, divisor),
    });
  }

  const result = [];
  const longestDataLength =
    shortDataLength + (shortBlockCount < blockCount ? 1 : 0);
  for (let index = 0; index < longestDataLength; index += 1) {
    blocks.forEach((block) => {
      if (index < block.data.length) result.push(block.data[index]);
    });
  }
  for (let index = 0; index < eccLength; index += 1) {
    blocks.forEach((block) => result.push(block.ecc[index]));
  }
  return result;
}
