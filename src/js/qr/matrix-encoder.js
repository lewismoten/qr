import { getDataCodewords, getRawDataModules } from './capacity.js';
import { FORMAT_ECL_BITS } from './constants.js';
import { createQrError } from './error.js';
import { assertVersion, getOwnOption } from './input-validation.js';
import {
  addErrorCorrection,
  getReedSolomonRemainder,
  makeReedSolomonDivisor,
} from './reed-solomon.js';
import { toShiftJis } from './kanji.js';
import { getMaskMap } from './mask.js';
import { getPenalty } from './penalty.js';
import {
  makeDataCodewords,
  optimizeSegments,
  selectVersionAndSegments,
} from './segments.js';

function getAlignmentPositions(version) {
  if (version === 1) return [];
  const size = version * 4 + 17;
  const count = Math.floor(version / 7) + 2;
  const step =
    version === 32 ? 26 : Math.ceil((size - 13) / (count * 2 - 2)) * 2;
  const result = [6];
  for (let position = size - 7; result.length < count; position -= step)
    result.splice(1, 0, position);
  return result;
}

class MatrixBuilder {
  constructor(version, errorLevel, codewords) {
    assertVersion(version);
    this.version = version;
    this.errorLevel = errorLevel;
    this.size = version * 4 + 17;
    this.modules = Array.from(
      { length: this.size },
      () => new Uint8Array(this.size),
    );
    this.functionModules = Array.from(
      { length: this.size },
      () => new Uint8Array(this.size),
    );
    this.drawFunctionPatterns();
    this.drawCodewords(codewords);
  }

  prepareMaskableColumns() {
    this.maskableColumns = this.functionModules.map((row) => {
      const columns = [];
      for (let column = 0; column < row.length; column += 1) {
        if (!row[column]) columns.push(column);
      }
      return Uint8Array.from(columns);
    });
  }

  setFunction(row, column, dark) {
    this.modules[row][column] = dark ? 1 : 0;
    this.functionModules[row][column] = 1;
  }

  drawFunctionPatterns() {
    for (let index = 0; index < this.size; index += 1) {
      this.setFunction(6, index, index % 2 === 0);
      this.setFunction(index, 6, index % 2 === 0);
    }
    this.drawFinder(3, 3);
    this.drawFinder(3, this.size - 4);
    this.drawFinder(this.size - 4, 3);

    const positions = getAlignmentPositions(this.version);
    positions.forEach((row, rowIndex) =>
      positions.forEach((column, columnIndex) => {
        const last = positions.length - 1;
        const overlapsFinder =
          (rowIndex === 0 && columnIndex === 0) ||
          (rowIndex === 0 && columnIndex === last) ||
          (rowIndex === last && columnIndex === 0);
        if (!overlapsFinder) this.drawAlignment(row, column);
      }),
    );
    this.drawFormatBits(0);
    this.drawVersionBits();
  }

  drawFinder(centerRow, centerColumn) {
    for (let rowOffset = -4; rowOffset <= 4; rowOffset += 1) {
      for (let columnOffset = -4; columnOffset <= 4; columnOffset += 1) {
        const row = centerRow + rowOffset;
        const column = centerColumn + columnOffset;
        if (row < 0 || row >= this.size || column < 0 || column >= this.size)
          continue;
        const distance = Math.max(Math.abs(rowOffset), Math.abs(columnOffset));
        this.setFunction(row, column, distance !== 2 && distance !== 4);
      }
    }
  }

  drawAlignment(centerRow, centerColumn) {
    for (let rowOffset = -2; rowOffset <= 2; rowOffset += 1) {
      for (let columnOffset = -2; columnOffset <= 2; columnOffset += 1) {
        this.setFunction(
          centerRow + rowOffset,
          centerColumn + columnOffset,
          Math.max(Math.abs(rowOffset), Math.abs(columnOffset)) !== 1,
        );
      }
    }
  }

  drawFormatBits(mask) {
    const data = (FORMAT_ECL_BITS[this.errorLevel] << 3) | mask;
    let remainder = data;
    for (let index = 0; index < 10; index += 1)
      remainder = (remainder << 1) ^ ((remainder >>> 9) * 0x537);
    const bits = ((data << 10) | remainder) ^ 0x5412;
    const bit = (index) => ((bits >>> index) & 1) !== 0;

    for (let index = 0; index <= 5; index += 1)
      this.setFunction(index, 8, bit(index));
    this.setFunction(7, 8, bit(6));
    this.setFunction(8, 8, bit(7));
    this.setFunction(8, 7, bit(8));
    for (let index = 9; index < 15; index += 1)
      this.setFunction(8, 14 - index, bit(index));
    for (let index = 0; index < 8; index += 1)
      this.setFunction(8, this.size - 1 - index, bit(index));
    for (let index = 8; index < 15; index += 1)
      this.setFunction(this.size - 15 + index, 8, bit(index));
    this.setFunction(this.size - 8, 8, true);
  }

  drawVersionBits() {
    if (this.version < 7) return;
    let remainder = this.version;
    for (let index = 0; index < 12; index += 1)
      remainder = (remainder << 1) ^ ((remainder >>> 11) * 0x1f25);
    const bits = (this.version << 12) | remainder;
    for (let index = 0; index < 18; index += 1) {
      const dark = ((bits >>> index) & 1) !== 0;
      const low = Math.floor(index / 3);
      const high = this.size - 11 + (index % 3);
      this.setFunction(low, high, dark);
      this.setFunction(high, low, dark);
    }
  }

  drawCodewords(codewords) {
    let bitIndex = 0;
    for (let right = this.size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vertical = 0; vertical < this.size; vertical += 1) {
        const upward = ((right + 1) & 2) === 0;
        const row = upward ? this.size - 1 - vertical : vertical;
        for (let pair = 0; pair < 2; pair += 1) {
          const column = right - pair;
          if (
            this.functionModules[row][column] ||
            bitIndex >= codewords.length * 8
          )
            continue;
          this.modules[row][column] =
            (codewords[bitIndex >>> 3] >>> (7 - (bitIndex & 7))) & 1;
          bitIndex += 1;
        }
      }
    }
    if (bitIndex !== codewords.length * 8)
      throw createQrError(
        'matrixBits',
        'The QR matrix could not place every encoded bit.',
      );
  }

  transitionMask(previousMask, nextMask) {
    const previous =
      previousMask === undefined ? null : getMaskMap(this.size, previousMask);
    const next = getMaskMap(this.size, nextMask);
    if (!this.maskableColumns) {
      for (let row = 0; row < this.size; row += 1) {
        const modules = this.modules[row];
        const functions = this.functionModules[row];
        const offset = row * this.size;
        for (let column = 0; column < this.size; column += 1) {
          if (!functions[column] && next[offset + column]) modules[column] ^= 1;
        }
      }
      return;
    }
    for (let row = 0; row < this.size; row += 1) {
      const columns = this.maskableColumns[row];
      const modules = this.modules[row];
      const offset = row * this.size;
      if (previous === null) {
        for (let item = 0; item < columns.length; item += 1) {
          const column = columns[item];
          if (next[offset + column]) modules[column] ^= 1;
        }
      } else {
        for (let item = 0; item < columns.length; item += 1) {
          const column = columns[item];
          const index = offset + column;
          if (previous[index] !== next[index]) modules[column] ^= 1;
        }
      }
    }
  }

  finish(requestedMask) {
    let mask = requestedMask;
    let appliedMask;
    if (mask === undefined) {
      this.prepareMaskableColumns();
      let minimumPenalty = Infinity;
      for (let candidate = 0; candidate < 8; candidate += 1) {
        this.transitionMask(appliedMask, candidate);
        appliedMask = candidate;
        this.drawFormatBits(candidate);
        const penalty = getPenalty(this.modules);
        if (penalty < minimumPenalty) {
          mask = candidate;
          minimumPenalty = penalty;
        }
      }
    }
    if (!Number.isInteger(mask) || mask < 0 || mask > 7)
      throw createQrError(
        'maskPattern',
        'Mask pattern must be an integer from 0 through 7.',
        undefined,
        RangeError,
      );
    this.transitionMask(appliedMask, mask);
    this.drawFormatBits(mask);
    return mask;
  }
}

function create(payload, options = {}) {
  const settings = options ?? {};
  const errorLevel = String(
    getOwnOption(settings, 'errorCorrectionLevel', 'M') || 'M',
  ).toUpperCase();
  if (!Object.hasOwn(FORMAT_ECL_BITS, errorLevel))
    throw createQrError(
      'errorCorrectionLevel',
      'Unknown QR error correction level: {level}.',
      { level: errorLevel },
    );
  const { segments, version } = selectVersionAndSegments(
    payload,
    errorLevel,
    getOwnOption(settings, 'version'),
  );
  const data = makeDataCodewords(segments, version, errorLevel);
  const codewords = addErrorCorrection(data, version, errorLevel);
  const builder = new MatrixBuilder(version, errorLevel, codewords);
  const maskPattern = builder.finish(getOwnOption(settings, 'maskPattern'));
  const flatModules = new Uint8Array(builder.size * builder.size);
  let moduleIndex = 0;
  for (const row of builder.modules) {
    flatModules.set(row, moduleIndex);
    moduleIndex += builder.size;
  }

  return {
    version,
    errorCorrectionLevel: errorLevel,
    maskPattern,
    segments,
    modules: {
      size: builder.size,
      data: flatModules,
      get(row, column) {
        return Boolean(flatModules[row * builder.size + column]);
      },
    },
  };
}

export default {
  create,
  toSJIS: toShiftJis,
  internals: {
    MatrixBuilder,
    getDataCodewords,
    getRawDataModules,
    makeReedSolomonDivisor,
    getReedSolomonRemainder,
    optimizeSegments,
  },
};
export { create, toShiftJis as toSJIS };
