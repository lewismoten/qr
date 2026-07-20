import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getAlignmentPatternCenters,
  getFormatInfoCoordinates,
} from '../../../src/js/app/qr/qr-regions.js';
import { getEncodingUnitBitLengths } from '../../../src/js/app/qr/encoding-units.js';

test('derives standard alignment centers and format coordinates', () => {
  assert.deepEqual(getAlignmentPatternCenters(1), []);
  assert.deepEqual(getAlignmentPatternCenters(2), [6, 18]);
  assert.deepEqual(getAlignmentPatternCenters(7), [6, 22, 38]);

  assert.deepEqual(getFormatInfoCoordinates(21), {
    primary: [
      [8, 0],
      [8, 1],
      [8, 2],
      [8, 3],
      [8, 4],
      [8, 5],
      [8, 7],
      [8, 8],
      [7, 8],
      [5, 8],
      [4, 8],
      [3, 8],
      [2, 8],
      [1, 8],
      [0, 8],
    ],
    secondary: [
      [20, 8],
      [19, 8],
      [18, 8],
      [17, 8],
      [16, 8],
      [15, 8],
      [14, 8],
      [8, 13],
      [8, 14],
      [8, 15],
      [8, 16],
      [8, 17],
      [8, 18],
      [8, 19],
      [8, 20],
    ],
  });
});

function segment(length, bits) {
  return {
    getLength: () => length,
    getBitsLength: () => bits,
  };
}

test('describes payload units for every supported QR mode', () => {
  assert.deepEqual(getEncodingUnitBitLengths(segment(3, 10), 'numeric'), [10]);
  assert.deepEqual(getEncodingUnitBitLengths(segment(2, 7), 'numeric'), [7]);
  assert.deepEqual(getEncodingUnitBitLengths(segment(1, 4), 'numeric'), [4]);
  assert.deepEqual(
    getEncodingUnitBitLengths(segment(3, 17), 'alphanumeric'),
    [11, 6],
  );
  assert.deepEqual(getEncodingUnitBitLengths(segment(1, 13), 'kanji'), [13]);
  assert.deepEqual(getEncodingUnitBitLengths(segment(2, 16), 'byte'), [8, 8]);
});
