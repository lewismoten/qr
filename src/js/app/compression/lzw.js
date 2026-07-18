import { createLocalizedError } from '../../localized-error.js';

/**
 * Packs palette indexes as a GIF-compatible LZW stream.
 *
 * This literal-oriented encoder clears the dictionary before code widths grow.
 * It favors a small, predictable implementation over maximum compression.
 */
export function encodeGifLzw(indexes, minimumCodeSize = 8) {
  if (
    !Number.isInteger(minimumCodeSize) ||
    minimumCodeSize < 2 ||
    minimumCodeSize > 8
  ) {
    throw createLocalizedError(
      'download.lzwCodeSize',
      'GIF LZW minimum code size must be an integer from 2 through 8.',
      undefined,
      RangeError,
    );
  }

  const clearCode = 1 << minimumCodeSize;
  const endCode = clearCode + 1;
  const codeSize = minimumCodeSize + 1;
  const maximumLiteralsBeforeClear = Math.min(200, clearCode - 2);
  const packed = [];
  let accumulator = 0;
  let bitCount = 0;
  let literalCount = 0;

  const writeCode = (code) => {
    accumulator |= code << bitCount;
    bitCount += codeSize;
    while (bitCount >= 8) {
      packed.push(accumulator & 255);
      accumulator >>>= 8;
      bitCount -= 8;
    }
  };

  writeCode(clearCode);
  indexes.forEach((index) => {
    if (!Number.isInteger(index) || index < 0 || index >= clearCode) {
      throw createLocalizedError(
        'download.lzwPaletteIndex',
        'GIF palette index must be between 0 and {maximum}.',
        { maximum: clearCode - 1 },
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

  if (bitCount) packed.push(accumulator & 255);
  return new Uint8Array(packed);
}
