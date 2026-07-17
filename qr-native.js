(function initializeNativeQr(globalScope) {
  'use strict';

  const ALPHANUMERIC = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';
  const MODE_BITS = { numeric: 0x1, alphanumeric: 0x2, byte: 0x4, kanji: 0x8 };
  const COUNT_BITS = {
    numeric: [10, 12, 14],
    alphanumeric: [9, 11, 13],
    byte: [8, 16, 16],
    kanji: [8, 10, 12],
  };
  const FORMAT_ECL_BITS = { L: 1, M: 0, Q: 3, H: 2 };
  const ECC_CODEWORDS_PER_BLOCK = {
    L: [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    M: [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
    Q: [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    H: [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  };
  const NUM_ERROR_CORRECTION_BLOCKS = {
    L: [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
    M: [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
    Q: [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
    H: [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81],
  };

  class BitBuffer {
    constructor() {
      this.bits = [];
    }

    append(value, length) {
      if (length < 0 || length > 31 || value >>> length !== 0) {
        throw new RangeError('Value does not fit in the requested bit length.');
      }
      for (let index = length - 1; index >= 0; index -= 1) {
        this.bits.push((value >>> index) & 1);
      }
    }
  }

  function getCountBitLength(mode, version) {
    return COUNT_BITS[mode][version <= 9 ? 0 : version <= 26 ? 1 : 2];
  }

  function getRawDataModules(version) {
    let result = (16 * version + 128) * version + 64;
    if (version >= 2) {
      const align = Math.floor(version / 7) + 2;
      result -= (25 * align - 10) * align - 55;
      if (version >= 7) result -= 36;
    }
    return result;
  }

  function getDataCodewords(version, errorLevel) {
    return Math.floor(getRawDataModules(version) / 8) -
      ECC_CODEWORDS_PER_BLOCK[errorLevel][version] * NUM_ERROR_CORRECTION_BLOCKS[errorLevel][version];
  }

  function detectMode(text) {
    if (/^[0-9]+$/.test(text)) return 'numeric';
    if ([...text].every((character) => ALPHANUMERIC.includes(character))) return 'alphanumeric';
    if ([...text].every((character) => character.codePointAt(0) > 0x7f && getQrKanjiValue(character) !== null)) return 'kanji';
    return 'byte';
  }

  let shiftJisMap;

  function getShiftJisMap() {
    if (shiftJisMap) return shiftJisMap;
    let decoder;
    try {
      decoder = new TextDecoder('shift_jis', { fatal: true });
    } catch (error) {
      throw new Error('Native Kanji mode requires browser Shift JIS decoding support.');
    }

    shiftJisMap = new Map();
    const leadRanges = [[0x81, 0x9f], [0xe0, 0xeb]];
    leadRanges.forEach(([firstLead, lastLead]) => {
      for (let lead = firstLead; lead <= lastLead; lead += 1) {
        for (let trail = 0x40; trail <= 0xfc; trail += 1) {
          if (trail === 0x7f) continue;
          try {
            const character = decoder.decode(Uint8Array.of(lead, trail));
            if ([...character].length === 1 && character !== '\ufffd' && !shiftJisMap.has(character)) {
              shiftJisMap.set(character, (lead << 8) | trail);
            }
          } catch (error) {
            // Unassigned Shift JIS byte pairs are not QR Kanji characters.
          }
        }
      }
    });
    return shiftJisMap;
  }

  function toShiftJis(character) {
    return getShiftJisMap().get(character);
  }

  function getQrKanjiValue(character) {
    const shiftJis = toShiftJis(character);
    if (!Number.isInteger(shiftJis)) return null;
    let adjusted;
    if (shiftJis >= 0x8140 && shiftJis <= 0x9ffc) adjusted = shiftJis - 0x8140;
    else if (shiftJis >= 0xe040 && shiftJis <= 0xebbf) adjusted = shiftJis - 0xc140;
    else return null;
    return ((adjusted >>> 8) * 0xc0) + (adjusted & 0xff);
  }

  function makeSegment(data, requestedMode) {
    const text = String(data);
    const mode = requestedMode || detectMode(text);
    if (!MODE_BITS[mode]) throw new Error(`Native QR mode is not supported yet: ${mode}.`);
    if (mode === 'numeric' && !/^[0-9]*$/.test(text)) throw new Error('Numeric mode only accepts digits 0-9.');
    if (mode === 'alphanumeric' && ![...text].every((character) => ALPHANUMERIC.includes(character))) {
      throw new Error('Alphanumeric mode contains unsupported characters.');
    }
    if (mode === 'kanji' && ![...text].every((character) => getQrKanjiValue(character) !== null)) {
      throw new Error('Kanji mode contains characters outside the QR Shift JIS ranges.');
    }

    const payload = new BitBuffer();
    let count;
    if (mode === 'numeric') {
      count = text.length;
      for (let index = 0; index < text.length; index += 3) {
        const part = text.slice(index, index + 3);
        payload.append(Number.parseInt(part, 10), part.length * 3 + 1);
      }
    } else if (mode === 'alphanumeric') {
      count = text.length;
      for (let index = 0; index + 1 < text.length; index += 2) {
        payload.append(ALPHANUMERIC.indexOf(text[index]) * 45 + ALPHANUMERIC.indexOf(text[index + 1]), 11);
      }
      if (text.length % 2) payload.append(ALPHANUMERIC.indexOf(text.at(-1)), 6);
    } else if (mode === 'byte') {
      const bytes = new TextEncoder().encode(text);
      count = bytes.length;
      bytes.forEach((byte) => payload.append(byte, 8));
    } else {
      const characters = [...text];
      count = characters.length;
      characters.forEach((character) => payload.append(getQrKanjiValue(character), 13));
    }

    return {
      data: text,
      mode,
      characterCount: count,
      bits: payload.bits,
      getBitsLength() {
        return this.bits.length;
      },
      getLength() {
        return this.characterCount;
      },
    };
  }

  function normalizeSegments(payload) {
    if (Array.isArray(payload)) {
      return payload.map((part) => makeSegment(part.data, typeof part.mode === 'string' ? part.mode : part.mode?.id));
    }
    return [makeSegment(payload)];
  }

  function getCharacterModes(character) {
    const modes = [];
    if (/^[0-9]$/.test(character)) modes.push('numeric');
    if (ALPHANUMERIC.includes(character)) modes.push('alphanumeric');
    if (character.codePointAt(0) > 0x7f && getQrKanjiValue(character) !== null) modes.push('kanji');
    modes.push('byte');
    return modes;
  }

  function getModeUnitCount(mode, character) {
    return mode === 'byte' ? new TextEncoder().encode(character).length : 1;
  }

  function getIncrementalPayloadBits(mode, previousCount, unitCount) {
    if (mode === 'numeric') return previousCount % 3 === 0 ? 4 : 3;
    if (mode === 'alphanumeric') return previousCount % 2 === 0 ? 6 : 5;
    if (mode === 'kanji') return 13;
    return unitCount * 8;
  }

  function getOptimizationKey(mode, count) {
    if (mode === 'numeric') return `${mode}:${count % 3}`;
    if (mode === 'alphanumeric') return `${mode}:${count % 2}`;
    return mode;
  }

  function optimizeSegments(text, version) {
    const characters = [...String(text)];
    if (!characters.length) return [makeSegment('', 'byte')];
    let states = [];

    characters.forEach((character) => {
      const nextStates = new Map();
      const availableModes = getCharacterModes(character);
      const previousStates = states.length ? states : [null];
      previousStates.forEach((previous) => {
        availableModes.forEach((mode) => {
          const unitCount = getModeUnitCount(mode, character);
          const countBits = getCountBitLength(mode, version);
          const maximumCount = 2 ** countBits - 1;
          const candidates = [{ continuing: false, previousCount: 0 }];
          if (previous?.mode === mode && previous.segmentCount + unitCount <= maximumCount) {
            candidates.push({ continuing: true, previousCount: previous.segmentCount });
          }

          candidates.forEach(({ continuing, previousCount }) => {
            const segmentCount = previousCount + unitCount;
            const cost = (previous?.cost || 0) +
              (continuing ? 0 : 4 + countBits) +
              getIncrementalPayloadBits(mode, previousCount, unitCount);
            const key = getOptimizationKey(mode, segmentCount);
            const existing = nextStates.get(key);
            const prefersSpecializedBoundary = existing && cost === existing.cost && !continuing && !existing.startsSegment;
            if (!existing || cost < existing.cost || prefersSpecializedBoundary) {
              nextStates.set(key, {
                cost,
                mode,
                segmentCount,
                character,
                startsSegment: !continuing,
                previous,
              });
            }
          });
        });
      });
      states = [...nextStates.values()];
    });

    const modePreference = { numeric: 0, alphanumeric: 1, kanji: 2, byte: 3 };
    let current = states.reduce((best, state) =>
      !best || state.cost < best.cost ||
      (state.cost === best.cost && modePreference[state.mode] < modePreference[best.mode])
        ? state
        : best,
    null);
    const encodedCharacters = [];
    while (current) {
      encodedCharacters.push(current);
      current = current.previous;
    }
    encodedCharacters.reverse();

    const optimized = [];
    encodedCharacters.forEach(({ character, mode, startsSegment }) => {
      if (startsSegment || !optimized.length) optimized.push({ mode, data: character });
      else optimized.at(-1).data += character;
    });
    return optimized.map(({ data, mode }) => makeSegment(data, mode));
  }

  function getRequiredBits(segments, version) {
    let total = 0;
    for (const segment of segments) {
      const countBits = getCountBitLength(segment.mode, version);
      if (segment.characterCount >= 2 ** countBits) return Infinity;
      total += 4 + countBits + segment.bits.length;
    }
    return total;
  }

  function chooseVersion(segments, errorLevel, requestedVersion) {
    const fits = (version) => getRequiredBits(segments, version) <= getDataCodewords(version, errorLevel) * 8;
    if (requestedVersion !== undefined) {
      if (!Number.isInteger(requestedVersion) || requestedVersion < 1 || requestedVersion > 40) {
        throw new RangeError('QR version must be an integer from 1 through 40.');
      }
      if (fits(requestedVersion)) return requestedVersion;
    }
    for (let version = 1; version <= 40; version += 1) {
      if (fits(version)) {
        if (requestedVersion !== undefined) {
          throw new Error(`The chosen QR Code version cannot contain this amount of data. Minimum version required is: ${version}.`);
        }
        return version;
      }
    }
    throw new Error('The content is too large for a version 40 QR Code.');
  }

  function selectVersionAndSegments(payload, errorLevel, requestedVersion) {
    if (Array.isArray(payload)) {
      const segments = normalizeSegments(payload);
      return { segments, version: chooseVersion(segments, errorLevel, requestedVersion) };
    }

    const text = String(payload);
    const optimizedByBucket = new Map();
    const getOptimized = (version) => {
      const bucketVersion = version <= 9 ? 1 : version <= 26 ? 10 : 27;
      if (!optimizedByBucket.has(bucketVersion)) optimizedByBucket.set(bucketVersion, optimizeSegments(text, bucketVersion));
      return optimizedByBucket.get(bucketVersion);
    };
    const fits = (version, segments) => getRequiredBits(segments, version) <= getDataCodewords(version, errorLevel) * 8;

    if (requestedVersion !== undefined) {
      if (!Number.isInteger(requestedVersion) || requestedVersion < 1 || requestedVersion > 40) {
        throw new RangeError('QR version must be an integer from 1 through 40.');
      }
      const requestedSegments = getOptimized(requestedVersion);
      if (fits(requestedVersion, requestedSegments)) return { segments: requestedSegments, version: requestedVersion };
    }

    for (let version = 1; version <= 40; version += 1) {
      const segments = getOptimized(version);
      if (!fits(version, segments)) continue;
      if (requestedVersion !== undefined) {
        throw new Error(`The chosen QR Code version cannot contain this amount of data. Minimum version required is: ${version}.`);
      }
      return { segments, version };
    }
    throw new Error('The content is too large for a version 40 QR Code.');
  }

  function makeDataCodewords(segments, version, errorLevel) {
    const capacity = getDataCodewords(version, errorLevel) * 8;
    const buffer = new BitBuffer();
    segments.forEach((segment) => {
      buffer.append(MODE_BITS[segment.mode], 4);
      buffer.append(segment.characterCount, getCountBitLength(segment.mode, version));
      buffer.bits.push(...segment.bits);
    });
    buffer.append(0, Math.min(4, capacity - buffer.bits.length));
    while (buffer.bits.length % 8) buffer.bits.push(0);
    for (let pad = 0xec; buffer.bits.length < capacity; pad ^= 0xec ^ 0x11) buffer.append(pad, 8);

    const result = [];
    for (let index = 0; index < buffer.bits.length; index += 8) {
      result.push(Number.parseInt(buffer.bits.slice(index, index + 8).join(''), 2));
    }
    return result;
  }

  function multiply(x, y) {
    let result = 0;
    for (let index = 7; index >= 0; index -= 1) {
      result = (result << 1) ^ ((result >>> 7) * 0x11d);
      result ^= ((y >>> index) & 1) * x;
    }
    return result;
  }

  function makeReedSolomonDivisor(degree) {
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

  function getReedSolomonRemainder(data, divisor) {
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

  function addErrorCorrection(data, version, errorLevel) {
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

  function getAlignmentPositions(version) {
    if (version === 1) return [];
    const size = version * 4 + 17;
    const count = Math.floor(version / 7) + 2;
    const step = version === 32 ? 26 : Math.ceil((size - 13) / (count * 2 - 2)) * 2;
    const result = [6];
    for (let position = size - 7; result.length < count; position -= step) result.splice(1, 0, position);
    return result;
  }

  function getMaskBit(mask, row, column) {
    switch (mask) {
      case 0: return (row + column) % 2 === 0;
      case 1: return row % 2 === 0;
      case 2: return column % 3 === 0;
      case 3: return (row + column) % 3 === 0;
      case 4: return (Math.floor(row / 2) + Math.floor(column / 3)) % 2 === 0;
      case 5: return ((row * column) % 2) + ((row * column) % 3) === 0;
      case 6: return (((row * column) % 2) + ((row * column) % 3)) % 2 === 0;
      case 7: return (((row + column) % 2) + ((row * column) % 3)) % 2 === 0;
      default: throw new RangeError('Mask pattern must be from 0 through 7.');
    }
  }

  class MatrixBuilder {
    constructor(version, errorLevel, codewords) {
      this.version = version;
      this.errorLevel = errorLevel;
      this.size = version * 4 + 17;
      this.modules = Array.from({ length: this.size }, () => Array(this.size).fill(false));
      this.functionModules = Array.from({ length: this.size }, () => Array(this.size).fill(false));
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
      positions.forEach((row, rowIndex) => positions.forEach((column, columnIndex) => {
        const last = positions.length - 1;
        const overlapsFinder =
          (rowIndex === 0 && columnIndex === 0) ||
          (rowIndex === 0 && columnIndex === last) ||
          (rowIndex === last && columnIndex === 0);
        if (!overlapsFinder) this.drawAlignment(row, column);
      }));
      this.drawFormatBits(0);
      this.drawVersionBits();
    }

    drawFinder(centerRow, centerColumn) {
      for (let rowOffset = -4; rowOffset <= 4; rowOffset += 1) {
        for (let columnOffset = -4; columnOffset <= 4; columnOffset += 1) {
          const row = centerRow + rowOffset;
          const column = centerColumn + columnOffset;
          if (row < 0 || row >= this.size || column < 0 || column >= this.size) continue;
          const distance = Math.max(Math.abs(rowOffset), Math.abs(columnOffset));
          this.setFunction(row, column, distance !== 2 && distance !== 4);
        }
      }
    }

    drawAlignment(centerRow, centerColumn) {
      for (let rowOffset = -2; rowOffset <= 2; rowOffset += 1) {
        for (let columnOffset = -2; columnOffset <= 2; columnOffset += 1) {
          this.setFunction(centerRow + rowOffset, centerColumn + columnOffset,
            Math.max(Math.abs(rowOffset), Math.abs(columnOffset)) !== 1);
        }
      }
    }

    drawFormatBits(mask) {
      const data = (FORMAT_ECL_BITS[this.errorLevel] << 3) | mask;
      let remainder = data;
      for (let index = 0; index < 10; index += 1) remainder = (remainder << 1) ^ ((remainder >>> 9) * 0x537);
      const bits = ((data << 10) | remainder) ^ 0x5412;
      const bit = (index) => ((bits >>> index) & 1) !== 0;

      for (let index = 0; index <= 5; index += 1) this.setFunction(index, 8, bit(index));
      this.setFunction(7, 8, bit(6));
      this.setFunction(8, 8, bit(7));
      this.setFunction(8, 7, bit(8));
      for (let index = 9; index < 15; index += 1) this.setFunction(8, 14 - index, bit(index));
      for (let index = 0; index < 8; index += 1) this.setFunction(8, this.size - 1 - index, bit(index));
      for (let index = 8; index < 15; index += 1) this.setFunction(this.size - 15 + index, 8, bit(index));
      this.setFunction(this.size - 8, 8, true);
    }

    drawVersionBits() {
      if (this.version < 7) return;
      let remainder = this.version;
      for (let index = 0; index < 12; index += 1) remainder = (remainder << 1) ^ ((remainder >>> 11) * 0x1f25);
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
            if (this.functionModules[row][column] || bitIndex >= codewords.length * 8) continue;
            this.modules[row][column] = ((codewords[bitIndex >>> 3] >>> (7 - (bitIndex & 7))) & 1) !== 0;
            bitIndex += 1;
          }
        }
      }
      if (bitIndex !== codewords.length * 8) throw new Error('Native QR matrix did not consume every codeword bit.');
    }

    applyMask(mask) {
      for (let row = 0; row < this.size; row += 1) {
        for (let column = 0; column < this.size; column += 1) {
          if (!this.functionModules[row][column] && getMaskBit(mask, row, column)) {
            this.modules[row][column] = !this.modules[row][column];
          }
        }
      }
    }

    getPenalty() {
      let result = 0;
      const lines = [
        ...this.modules,
        ...Array.from({ length: this.size }, (_, column) => this.modules.map((row) => row[column])),
      ];
      lines.forEach((line) => {
        let run = 1;
        for (let index = 1; index <= line.length; index += 1) {
          if (index < line.length && line[index] === line[index - 1]) {
            run += 1;
          } else {
            if (run >= 5) result += run - 2;
            run = 1;
          }
        }
        const pattern = line.map((dark) => dark ? '1' : '0').join('');
        for (let index = 0; index + 11 <= pattern.length; index += 1) {
          const sample = pattern.slice(index, index + 11);
          if (sample === '00001011101' || sample === '10111010000') result += 40;
        }
      });
      for (let row = 0; row < this.size - 1; row += 1) {
        for (let column = 0; column < this.size - 1; column += 1) {
          const color = this.modules[row][column];
          if (color === this.modules[row][column + 1] && color === this.modules[row + 1][column] &&
              color === this.modules[row + 1][column + 1]) result += 3;
        }
      }
      const darkCount = this.modules.flat().filter(Boolean).length;
      const darkPercentStep = Math.ceil((darkCount * 100 / (this.size * this.size)) / 5);
      result += Math.abs(darkPercentStep - 10) * 10;
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
      if (!Number.isInteger(mask) || mask < 0 || mask > 7) throw new RangeError('Mask pattern must be from 0 through 7.');
      this.applyMask(mask);
      this.drawFormatBits(mask);
      return mask;
    }
  }

  function create(payload, options = {}) {
    const errorLevel = String(options.errorCorrectionLevel || 'M').toUpperCase();
    if (!FORMAT_ECL_BITS.hasOwnProperty(errorLevel)) throw new Error(`Unknown error correction level: ${errorLevel}.`);
    const { segments, version } = selectVersionAndSegments(payload, errorLevel, options.version);
    const data = makeDataCodewords(segments, version, errorLevel);
    const codewords = addErrorCorrection(data, version, errorLevel);
    const builder = new MatrixBuilder(version, errorLevel, codewords);
    const maskPattern = builder.finish(options.maskPattern);
    const flatModules = Uint8Array.from(builder.modules.flat(), (dark) => dark ? 1 : 0);

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
    internals: { getDataCodewords, getRawDataModules, makeReedSolomonDivisor, getReedSolomonRemainder, optimizeSegments },
  };
  globalScope.NativeQRCode = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
