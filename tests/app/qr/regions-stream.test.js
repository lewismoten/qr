import assert from 'node:assert/strict';
import test from 'node:test';

import {
  coordKey,
  getAlignmentPatternCenters,
  getDataTraversal,
  getFinderPatternPart,
  getFormatBitGroups,
  getFormatInfoCoordinates,
  getModuleCategory,
  getVersionInfoCoordinates,
  isAlignmentRegion,
  isDarkModuleRegion,
  isFinderPattern,
  isFinderRegion,
  isFormatRegion,
  isFunctionModule,
  isInSquare,
  isTimingRegion,
  isVersionRegion,
} from '../../../src/js/app/qr/qr-regions.js';
import { getEncodingUnitBitLengths } from '../../../src/js/app/qr/encoding-units.js';

test('derives standard alignment centers and format coordinates', () => {
  assert.deepEqual(getAlignmentPatternCenters(1), []);
  assert.deepEqual(getAlignmentPatternCenters(2), [6, 18]);
  assert.deepEqual(getAlignmentPatternCenters(7), [6, 22, 38]);
  assert.deepEqual(getAlignmentPatternCenters(32), [6, 34, 60, 86, 112, 138]);

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

test('classifies finder and fixed QR regions at their boundaries', () => {
  assert.equal(isInSquare(2, 3, 1, 2, 3), true);
  assert.equal(isInSquare(0, 3, 1, 2, 3), false);
  assert.equal(isFinderPattern(21, 0, 0), true);
  assert.equal(isFinderPattern(21, 0, 20), true);
  assert.equal(isFinderPattern(21, 20, 0), true);
  assert.equal(isFinderPattern(21, 20, 20), false);
  assert.equal(getFinderPatternPart(21, 3, 3), 'center');
  assert.equal(getFinderPatternPart(21, 0, 0), 'outer');
  assert.equal(getFinderPatternPart(21, 1, 1), null);
  assert.equal(getFinderPatternPart(21, 10, 10), null);
  assert.equal(isFinderRegion(21, 7, 7), true);
  assert.equal(isFinderRegion(21, 13, 13), false);
  assert.equal(isTimingRegion(21, 6, 8), true);
  assert.equal(isTimingRegion(21, 8, 6), true);
  assert.equal(isTimingRegion(21, 7, 7), false);
  assert.equal(isFormatRegion(21, 8, 0), true);
  assert.equal(isFormatRegion(21, 0, 8), true);
  assert.equal(isFormatRegion(21, 8, 20), true);
  assert.equal(isFormatRegion(21, 20, 8), true);
  assert.equal(isFormatRegion(21, 12, 8), false);
  assert.equal(isVersionRegion(21, 1, 0, 10), false);
  assert.equal(isVersionRegion(45, 7, 0, 34), true);
  assert.equal(isVersionRegion(45, 7, 34, 0), true);
  assert.equal(isVersionRegion(45, 7, 20, 20), false);
  assert.equal(isDarkModuleRegion(21, 13, 8), true);
  assert.equal(isDarkModuleRegion(21, 12, 8), false);
});

test('classifies alignment, data traversal, and metadata bit groups', () => {
  assert.equal(isAlignmentRegion(2, 25, 18, 18), true);
  assert.equal(isAlignmentRegion(2, 25, 6, 6), false);
  assert.equal(isAlignmentRegion(2, 25, 10, 10), false);
  const definition = { version: 2, modules: { size: 25 } };
  assert.equal(isFunctionModule(definition, 0, 0), true);
  assert.equal(isFunctionModule(definition, 24, 24), false);
  assert.equal(getModuleCategory(definition, 0, 0), 'finder');
  assert.equal(getModuleCategory(definition, 6, 8), 'timing');
  assert.equal(getModuleCategory(definition, 17, 8), 'darkModule');
  assert.equal(getModuleCategory(definition, 8, 24), 'format');
  assert.equal(getModuleCategory(definition, 18, 18), 'alignment');
  assert.equal(getModuleCategory(definition, 24, 24), 'data');
  const versionDefinition = { version: 7, modules: { size: 45 } };
  assert.equal(getModuleCategory(versionDefinition, 0, 34), 'version');

  const traversal = getDataTraversal(definition);
  assert.ok(traversal.length > 0);
  assert.deepEqual(traversal[0], { row: 24, column: 24 });
  assert.equal(
    traversal.some(({ row, column }) =>
      isFunctionModule(definition, row, column),
    ),
    false,
  );
  assert.equal(
    new Set(traversal.map(({ row, column }) => coordKey(row, column))).size,
    traversal.length,
  );

  const groups = getFormatBitGroups(21);
  assert.equal(groups.ecLevelBits.size, 4);
  assert.equal(groups.maskBits.size, 6);
  const versionCoordinates = getVersionInfoCoordinates(45);
  assert.equal(versionCoordinates.primary.length, 18);
  assert.equal(versionCoordinates.secondary.length, 18);
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
  assert.deepEqual(getEncodingUnitBitLengths(segment(0, 3), 'unknown'), [3]);
  assert.deepEqual(
    getEncodingUnitBitLengths({ getBitsLength: () => 0 }, 'byte'),
    [],
  );
});
