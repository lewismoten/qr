import { createLocalizedError } from '../../localized-error.js';

const MINIMUM_CODE_SIZE = 2;
const MAXIMUM_CODE_SIZE = 8;
const DEFAULT_CODE_SIZE = 8;
const BITS_PER_BYTE = 8;
const BYTE_MASK = 0xff;
const LITERAL_LIMIT = 200;
const RESERVED_CODE_COUNT = 2;

/**
 * Packs palette indexes as a GIF-compatible LZW stream.
 *
 * This literal-oriented encoder clears the dictionary before code widths grow.
 * It favors a small, predictable implementation over maximum compression.
 */
export function encodeGifLzw(indexes, minimumCodeSize = DEFAULT_CODE_SIZE) {
  if (
    !Number.isInteger(minimumCodeSize) ||
    minimumCodeSize < MINIMUM_CODE_SIZE ||
    minimumCodeSize > MAXIMUM_CODE_SIZE
  ) {
    throw createLocalizedError(
      'download.lzwCodeSize',
      'GIF LZW minimum code size must be an integer from {minimum} through {maximum}.',
      { minimum: MINIMUM_CODE_SIZE, maximum: MAXIMUM_CODE_SIZE },
      RangeError,
    );
  }

  const clearCode = 1 << minimumCodeSize;
  const endCode = clearCode + 1;
  const codeSize = minimumCodeSize + 1;
  const maximumLiteralsBeforeClear = Math.min(
    LITERAL_LIMIT,
    clearCode - RESERVED_CODE_COUNT,
  );
  const packed = [];
  let accumulator = 0;
  let bitCount = 0;
  let literalCount = 0;

  const writeCode = (code) => {
    accumulator |= code << bitCount;
    bitCount += codeSize;
    while (bitCount >= BITS_PER_BYTE) {
      packed.push(accumulator & BYTE_MASK);
      accumulator >>>= BITS_PER_BYTE;
      bitCount -= BITS_PER_BYTE;
    }
  };

  writeCode(clearCode);
  indexes.forEach((index) => {
    if (!Number.isInteger(index) || index < 0 || index >= clearCode) {
      throw createLocalizedError(
        'download.lzwPaletteIndex',
        'GIF palette index must be between {minimum} and {maximum}.',
        { minimum: 0, maximum: clearCode - 1 },
        RangeError,
      );
    }
    writeCode(index);
    literalCount += 1;
    if (literalCount === maximumLiteralsBeforeClear) {
      writeCode(clearCode);
      literalCount = 0;
    }
  });
  writeCode(endCode);

  if (bitCount) packed.push(accumulator & BYTE_MASK);
  return new Uint8Array(packed);
}
