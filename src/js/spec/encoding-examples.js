import qrEncoder, { COUNT_BITS, MODE_BITS } from '@lewismoten/qr';

import { lookup } from '../i18n/index.js';
import { MIXED_TEXT } from './visual-models.js';

const MODE_LABELS = {
  numeric: ['spec.modes.numeric', 'Numeric'],
  alphanumeric: ['spec.modes.alphanumeric', 'Alphanumeric'],
  byte: ['spec.modes.byte', 'Byte mode'],
  kanji: ['spec.modes.kanji', 'Kanji'],
};

function toBits(value, length) {
  return Number(value).toString(2).padStart(length, '0');
}

function getCountWidth(mode, version = 1) {
  const bucket = version <= 9 ? 0 : version <= 26 ? 1 : 2;
  return COUNT_BITS[mode][bucket];
}

function describeUnit(mode, value, segment) {
  if (mode === 'numeric')
    return lookup(
      'spec.units.numeric',
      '{value} is stored as one {bits}-bit binary number.',
      { value, bits: segment.bits.length },
    );
  if (mode === 'alphanumeric')
    return lookup(
      'spec.units.alphanumeric',
      '{first} × {radix} + {second} = {result}, stored in {bits} bits.',
      {
        first: 10,
        radix: 45,
        second: 11,
        result: 461,
        bits: segment.bits.length,
      },
    );
  if (mode === 'byte')
    return lookup(
      'spec.units.byte',
      'The visible character is UTF-8 {encoding}, so the count is {count} and the payload is {bits} bits.',
      {
        encoding: [...new TextEncoder().encode(value)]
          .map((byte) => byte.toString(16).padStart(2, '0').toUpperCase())
          .join(' '),
        count: segment.characterCount,
        bits: segment.bits.length,
      },
    );
  const shiftJis = qrEncoder
    .toSJIS(value)
    .toString(16)
    .toUpperCase()
    .padStart(4, '0');
  return lookup(
    'spec.units.kanji',
    'Shift JIS {value} is transformed into one {bits}-bit QR Kanji value.',
    { value: shiftJis, bits: segment.bits.length },
  );
}

function renderUnitExample(example) {
  const mode = example.dataset.unitMode;
  const value = example.dataset.unitValue;
  const definition = qrEncoder.create([{ mode, data: value }], {
    version: 1,
    errorCorrectionLevel: 'L',
  });
  const segment = definition.segments[0];
  example.querySelector('[data-mode-bits]').textContent = toBits(
    MODE_BITS[mode],
    4,
  );
  example.querySelector('[data-count-bits]').textContent = toBits(
    segment.characterCount,
    getCountWidth(mode),
  );
  example.querySelector('[data-payload-bits]').textContent =
    segment.bits.join('');
  example.querySelector('[data-unit-detail]').textContent = describeUnit(
    mode,
    value,
    segment,
  );
}

function createMixedSegment(segment, index) {
  const mode = segment.mode;
  const element = document.createElement('article');
  element.className = `mixed-segment ${mode}`;
  const number = document.createElement('span');
  number.className = 'segment-number';
  number.textContent = lookup('spec.mixed.segment', 'Segment {number}', {
    number: index + 1,
  });
  const heading = document.createElement('strong');
  heading.textContent = lookup(...MODE_LABELS[mode]);
  const source = document.createElement('code');
  source.textContent = segment.data;
  const fields = document.createElement('span');
  fields.textContent = lookup(
    'spec.mixed.fields',
    'mode {mode} | count {count} | payload: {bits} bits',
    {
      mode: toBits(MODE_BITS[mode], 4),
      count: toBits(segment.characterCount, getCountWidth(mode)),
      bits: segment.bits.length,
    },
  );
  element.append(number, heading, source, fields);
  return element;
}

function getMixedBitCounts(segments) {
  const mixed = segments.reduce(
    (total, segment) =>
      total + 4 + getCountWidth(segment.mode) + segment.bits.length,
    0,
  );
  const byteSegment = qrEncoder.create([{ mode: 'byte', data: MIXED_TEXT }], {
    version: 2,
    errorCorrectionLevel: 'L',
  }).segments[0];
  return {
    mixed,
    bytes: 4 + getCountWidth('byte') + byteSegment.bits.length,
  };
}

export function renderEncodingExamples() {
  document
    .querySelectorAll('[data-unit-mode]')
    .forEach((example) => renderUnitExample(example));

  const mixedStream = document.getElementById('mixed-mode-stream');
  if (!mixedStream) return;
  const segments = qrEncoder.internals.optimizeSegments(MIXED_TEXT, 1);
  segments.forEach((segment, index) => {
    mixedStream.append(createMixedSegment(segment, index));
  });
  const counts = getMixedBitCounts(segments);
  document.getElementById('mixed-mode-savings').textContent = lookup(
    'spec.mixed.savings',
    '{mixed} bits vs {bytes} using Byte mode only',
    { mixed: counts.mixed, bytes: counts.bytes },
  );
}
