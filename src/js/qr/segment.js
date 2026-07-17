import { BitBuffer } from './bit-buffer.js';
import { ALPHANUMERIC, MODE_BITS } from './constants.js';
import { createQrError } from './error.js';
import { getQrKanjiValue } from './kanji.js';

const textEncoder = new TextEncoder();

function detectMode(text) {
  if (/^[0-9]+$/.test(text)) return 'numeric';
  if ([...text].every((character) => ALPHANUMERIC.includes(character))) {
    return 'alphanumeric';
  }
  return 'byte';
}

export function makeSegment(data, requestedMode) {
  const text = String(data);
  const mode = requestedMode || detectMode(text);
  if (!MODE_BITS[mode]) {
    throw createQrError(
      'modeUnsupported',
      'Native QR mode is not supported yet: {mode}.',
      { mode },
    );
  }
  if (mode === 'numeric' && !/^[0-9]*$/.test(text)) {
    throw createQrError(
      'numericCharacters',
      'Numeric mode only accepts digits 0-9.',
    );
  }
  if (
    mode === 'alphanumeric' &&
    ![...text].every((character) => ALPHANUMERIC.includes(character))
  ) {
    throw createQrError(
      'alphanumericCharacters',
      'Alphanumeric mode contains unsupported characters.',
    );
  }
  if (
    mode === 'kanji' &&
    ![...text].every((character) => getQrKanjiValue(character) !== null)
  ) {
    throw createQrError(
      'kanjiCharacters',
      'Kanji mode contains characters outside the QR Shift JIS ranges.',
    );
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
      payload.append(
        ALPHANUMERIC.indexOf(text[index]) * 45 +
          ALPHANUMERIC.indexOf(text[index + 1]),
        11,
      );
    }
    if (text.length % 2) payload.append(ALPHANUMERIC.indexOf(text.at(-1)), 6);
  } else if (mode === 'byte') {
    const bytes = textEncoder.encode(text);
    count = bytes.length;
    bytes.forEach((byte) => payload.append(byte, 8));
  } else {
    const characters = [...text];
    count = characters.length;
    characters.forEach((character) =>
      payload.append(getQrKanjiValue(character), 13),
    );
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
