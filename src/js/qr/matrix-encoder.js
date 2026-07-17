import { getDataCodewords, getRawDataModules } from './capacity.js';
import { FORMAT_ECL_BITS } from './constants.js';
import {
  addErrorCorrection,
  getReedSolomonRemainder,
  makeReedSolomonDivisor,
} from './reed-solomon.js';
import { toShiftJis } from './kanji.js';
import { isMaskActive } from './mask.js';
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
    this.version = version;
    this.errorLevel = errorLevel;
    this.size = version * 4 + 17;
    this.modules = Array.from({ length: this.size }, () =>
      Array(this.size).fill(false),
    );
    this.functionModules = Array.from({ length: this.size }, () =>
      Array(this.size).fill(false),
    );
    this.drawFunctionPatterns();
    this.drawCodewords(codewords);
  }

  setFunction(row, column, dark) {
    this.modules[row][column] = dark;
    this.functionModules[row][column] = true;
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
            ((codewords[bitIndex >>> 3] >>> (7 - (bitIndex & 7))) & 1) !== 0;
          bitIndex += 1;
        }
      }
    }
    if (bitIndex !== codewords.length * 8)
      throw new Error('Native QR matrix did not consume every codeword bit.');
  }

  applyMask(mask) {
    for (let row = 0; row < this.size; row += 1) {
      for (let column = 0; column < this.size; column += 1) {
        if (
          !this.functionModules[row][column] &&
          isMaskActive(mask, row, column)
        ) {
          this.modules[row][column] = !this.modules[row][column];
        }
      }
    }
  }

  getPenalty() {
    let result = 0;
    let darkCount = 0;

    const scoreLine = (getModule) => {
      let run = 1;
      let pattern = getModule(0) ? 1 : 0;
      for (let index = 1; index <= this.size; index += 1) {
        if (index < this.size && getModule(index) === getModule(index - 1)) {
          run += 1;
        } else {
          if (run >= 5) result += run - 2;
          run = 1;
        }

        if (index < this.size) {
          pattern = ((pattern << 1) | (getModule(index) ? 1 : 0)) & 0x7ff;
          if (index >= 10 && (pattern === 0x05d || pattern === 0x5d0))
            result += 40;
        }
      }
    };

    for (let row = 0; row < this.size; row += 1) {
      scoreLine((column) => this.modules[row][column]);
      for (let column = 0; column < this.size; column += 1) {
        if (this.modules[row][column]) darkCount += 1;
      }
    }
    for (let column = 0; column < this.size; column += 1) {
      scoreLine((row) => this.modules[row][column]);
    }

    for (let row = 0; row < this.size - 1; row += 1) {
      for (let column = 0; column < this.size - 1; column += 1) {
        const color = this.modules[row][column];
        if (
          color === this.modules[row][column + 1] &&
          color === this.modules[row + 1][column] &&
          color === this.modules[row + 1][column + 1]
        )
          result += 3;
      }
    }
    const darkPercentage = (darkCount * 100) / (this.size * this.size);
    result += Math.floor(Math.abs(darkPercentage - 50) / 5) * 10;
    return result;
  }

  finish(requestedMask) {
    let mask = requestedMask;
    if (mask === undefined) {
      let minimumPenalty = Infinity;
      for (let candidate = 0; candidate < 8; candidate += 1) {
        this.applyMask(candidate);
        this.drawFormatBits(candidate);
        const penalty = this.getPenalty();
        if (penalty < minimumPenalty) {
          mask = candidate;
          minimumPenalty = penalty;
        }
        this.applyMask(candidate);
      }
    }
    if (!Number.isInteger(mask) || mask < 0 || mask > 7)
      throw new RangeError('Mask pattern must be from 0 through 7.');
    this.applyMask(mask);
    this.drawFormatBits(mask);
    return mask;
  }
}

function create(payload, options = {}) {
  const errorLevel = String(options.errorCorrectionLevel || 'M').toUpperCase();
  if (!Object.hasOwn(FORMAT_ECL_BITS, errorLevel))
    throw new Error(`Unknown error correction level: ${errorLevel}.`);
  const { segments, version } = selectVersionAndSegments(
    payload,
    errorLevel,
    options.version,
  );
  const data = makeDataCodewords(segments, version, errorLevel);
  const codewords = addErrorCorrection(data, version, errorLevel);
  const builder = new MatrixBuilder(version, errorLevel, codewords);
  const maskPattern = builder.finish(options.maskPattern);
  const flatModules = Uint8Array.from(builder.modules.flat(), (dark) =>
    dark ? 1 : 0,
  );

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

const api = {
  create,
  toSJIS: toShiftJis,
  internals: {
    getDataCodewords,
    getRawDataModules,
    makeReedSolomonDivisor,
    getReedSolomonRemainder,
    optimizeSegments,
  },
};
export { create, toShiftJis as toSJIS };
export default api;
