import { ECC_CODEWORDS_PER_BLOCK, NUM_ERROR_CORRECTION_BLOCKS } from './constants.js';
import { getRawDataModules } from './capacity.js';

function multiply(x, y) {
  let result = 0;
  for (let index = 7; index >= 0; index -= 1) {
    result = (result << 1) ^ ((result >>> 7) * 0x11d);
    result ^= ((y >>> index) & 1) * x;
  }
  return result;
}

export function makeReedSolomonDivisor(degree) {
  const result = Array(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;
  for (let index = 0; index < degree; index += 1) {
    for (let coefficient = 0; coefficient < degree; coefficient += 1) {
      result[coefficient] = multiply(result[coefficient], root);
      if (coefficient + 1 < degree) result[coefficient] ^= result[coefficient + 1];
    }
    root = multiply(root, 2);
  }
  return result;
}

export function getReedSolomonRemainder(data, divisor) {
  const result = Array(divisor.length).fill(0);
  data.forEach((byte) => {
    const factor = byte ^ result.shift();
    result.push(0);
    divisor.forEach((coefficient, index) => {
      result[index] ^= multiply(coefficient, factor);
    });
  });
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
    blocks.push({ data: blockData, ecc: getReedSolomonRemainder(blockData, divisor) });
  }

  const result = [];
  const longestDataLength = shortDataLength + (shortBlockCount < blockCount ? 1 : 0);
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
