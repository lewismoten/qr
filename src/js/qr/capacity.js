import {
  COUNT_BITS,
  ECC_CODEWORDS_PER_BLOCK,
  NUM_ERROR_CORRECTION_BLOCKS,
} from './constants.js';

export function getCountBitLength(mode, version) {
  return COUNT_BITS[mode][version <= 9 ? 0 : version <= 26 ? 1 : 2];
}

export function getRawDataModules(version) {
  let result = (16 * version + 128) * version + 64;
  if (version >= 2) {
    const align = Math.floor(version / 7) + 2;
    result -= (25 * align - 10) * align - 55;
    if (version >= 7) result -= 36;
  }
  return result;
}

export function getDataCodewords(version, errorLevel) {
  return (
    Math.floor(getRawDataModules(version) / 8) -
    ECC_CODEWORDS_PER_BLOCK[errorLevel][version] *
      NUM_ERROR_CORRECTION_BLOCKS[errorLevel][version]
  );
}
