import assert from 'node:assert/strict';
import { encodeGifLzw } from '../src/js/app/compression/lzw.js';

function unpackFixedWidthCodes(bytes, codeSize) {
  const codes = [];
  let accumulator = 0;
  let bitCount = 0;
  bytes.forEach((byte) => {
    accumulator |= byte << bitCount;
    bitCount += 8;
    while (bitCount >= codeSize) {
      codes.push(accumulator & ((1 << codeSize) - 1));
      accumulator >>>= codeSize;
      bitCount -= codeSize;
    }
  });
  return codes;
}

const indexes = Uint8Array.from({ length: 255 }, (_, index) => index % 256);
const codes = unpackFixedWidthCodes(encodeGifLzw(indexes), 9);

assert.deepEqual(codes.slice(0, 4), [256, 0, 1, 2], 'stream begins with clear code and literals');
assert.equal(codes[201], 256, 'dictionary is periodically cleared before 9-bit codes would grow');
assert.equal(codes.at(-1), 257, 'stream ends with the GIF end-of-information code');
assert.throws(() => encodeGifLzw([4], 2), /palette index/);
assert.throws(() => encodeGifLzw([], 1), /minimum code size/);

console.log('GIF LZW tests passed.');
