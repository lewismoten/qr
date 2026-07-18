import assert from 'node:assert/strict';
import { BitBuffer } from '../src/js/qr/bit-buffer.js';
import { getQrKanjiValue } from '../src/js/qr/kanji.js';
import { isMaskActive } from '../src/js/qr/mask.js';
import NativeQRCode from '../src/js/qr/matrix-encoder.js';
import { makeSegment } from '../src/js/qr/segment.js';

function matrixSignature(definition) {
  return Buffer.from(definition.modules.data).toString('base64');
}

function testCapacityBoundaries() {
  const boundaries = [
    { mode: 'numeric', maximum: '1'.repeat(41), overflow: '1'.repeat(42) },
    { mode: 'alphanumeric', maximum: 'A'.repeat(25), overflow: 'A'.repeat(26) },
    { mode: 'byte', maximum: 'A'.repeat(17), overflow: 'A'.repeat(18) },
  ];
  boundaries.forEach(({ mode, maximum, overflow }) => {
    assert.equal(
      NativeQRCode.create([{ data: maximum, mode }], {
        errorCorrectionLevel: 'L',
      }).version,
      1,
    );
    assert.equal(
      NativeQRCode.create([{ data: overflow, mode }], {
        errorCorrectionLevel: 'L',
      }).version,
      2,
    );
  });
  assert.equal(
    NativeQRCode.create([{ data: 'A'.repeat(14), mode: 'byte' }], {
      errorCorrectionLevel: 'M',
    }).version,
    1,
  );
  assert.throws(
    () =>
      NativeQRCode.create([{ data: 'A'.repeat(18), mode: 'byte' }], {
        errorCorrectionLevel: 'L',
        version: 1,
      }),
    /Minimum version required is: 2/,
  );
}

function testEveryVersionAndCorrectionLevel() {
  for (const errorCorrectionLevel of ['L', 'M', 'Q', 'H']) {
    for (let version = 1; version <= 40; version += 1) {
      const definition = NativeQRCode.create('A', {
        errorCorrectionLevel,
        version,
        maskPattern: 0,
      });
      assert.equal(definition.version, version);
      assert.equal(definition.modules.size, version * 4 + 17);
      assert.equal(
        definition.modules.data.length,
        definition.modules.size ** 2,
      );
      assert.ok(
        [...definition.modules.data].every(
          (module) => module === 0 || module === 1,
        ),
      );
      assert.equal(
        definition.modules.get(3, 3),
        true,
        `finder center V${version}-${errorCorrectionLevel}`,
      );
      assert.equal(
        definition.modules.get(definition.modules.size - 8, 8),
        true,
        `dark module V${version}-${errorCorrectionLevel}`,
      );
    }
  }
}

function testModesAndUtf8() {
  const empty = NativeQRCode.create('');
  assert.equal(empty.segments.length, 1);
  assert.equal(empty.segments[0].mode, 'byte');
  assert.equal(empty.segments[0].data, '');
  assert.equal(makeSegment('123').mode, 'numeric');
  assert.equal(makeSegment('HELLO').mode, 'alphanumeric');
  assert.equal(makeSegment('lowercase').mode, 'byte');
  assert.equal(NativeQRCode.create('12345').segments[0].mode, 'numeric');
  assert.equal(
    NativeQRCode.create('HELLO WORLD').segments[0].mode,
    'alphanumeric',
  );
  const utf8 = NativeQRCode.create('Hello, 世界');
  assert.deepEqual(
    utf8.segments.map(({ mode }) => mode),
    ['byte'],
  );
  assert.equal(utf8.segments[0].characterCount, 13);
  assert.equal(utf8.segments[0].getBitsLength(), 104);
  assert.equal(utf8.segments[0].getLength(), 13);
  const utf8Widths = NativeQRCode.create('é世😀');
  assert.equal(utf8Widths.segments[0].characterCount, 9);
  assert.equal(utf8Widths.segments[0].getBitsLength(), 72);
  assert.throws(
    () => NativeQRCode.create([{ data: '12-A', mode: 'numeric' }]),
    /only accepts digits/,
  );
  assert.throws(
    () => NativeQRCode.create([{ data: 'lowercase', mode: 'alphanumeric' }]),
    /unsupported characters/,
  );
  assert.throws(
    () => NativeQRCode.create([{ data: 'anything', mode: 'imaginary' }]),
    (error) => error.i18nKey === 'qr.errors.modeUnsupported',
  );
}

function testBitBufferLimits() {
  const buffer = new BitBuffer();
  buffer.append(0b101, 3);
  assert.deepEqual(buffer.bits, [1, 0, 1]);
  for (const [value, length] of [
    [1, -1],
    [1, 32],
    [4, 2],
  ]) {
    assert.throws(
      () => buffer.append(value, length),
      (error) =>
        error instanceof RangeError && error.i18nKey === 'qr.errors.bitLength',
    );
  }
}

function testKanjiAndMixedModes() {
  const OriginalTextDecoder = globalThis.TextDecoder;
  globalThis.TextDecoder = class {
    constructor() {
      throw new Error('Shift JIS unavailable');
    }
  };
  try {
    assert.throws(
      () => getQrKanjiValue('あ'),
      (error) => error.i18nKey === 'qr.errors.kanjiUnsupported',
    );
  } finally {
    globalThis.TextDecoder = OriginalTextDecoder;
  }

  const kanji = NativeQRCode.create([{ data: 'あかが', mode: 'kanji' }], {
    errorCorrectionLevel: 'M',
  });
  assert.equal(kanji.segments[0].characterCount, 3);
  assert.equal(kanji.segments[0].getBitsLength(), 39);
  assert.equal(NativeQRCode.toSJIS('あ'), 0x82a0);
  assert.equal(getQrKanjiValue('蜿'), 0x1b4f);
  assert.throws(
    () => NativeQRCode.create([{ data: 'QRあ', mode: 'kanji' }]),
    /outside the QR Shift JIS ranges/,
  );

  const mixed = NativeQRCode.create('ABC123あかがXYZ789');
  assert.deepEqual(
    mixed.segments.map(({ mode }) => mode),
    ['alphanumeric', 'byte', 'alphanumeric'],
  );
  assert.deepEqual(
    mixed.segments.map(({ data }) => data),
    ['ABC123', 'あかが', 'XYZ789'],
  );
}

function testVersion40CapacityLimits() {
  const maximums = [
    ['numeric', '1'.repeat(7089)],
    ['alphanumeric', 'A'.repeat(4296)],
    ['byte', 'a'.repeat(2953)],
    ['kanji', 'あ'.repeat(1817)],
  ];
  maximums.forEach(([mode, payload]) => {
    assert.equal(
      NativeQRCode.create([{ data: payload, mode }], {
        errorCorrectionLevel: 'L',
      }).version,
      40,
    );
    assert.throws(
      () =>
        NativeQRCode.create(
          [
            {
              data: `${payload}${mode === 'numeric' ? '1' : mode === 'kanji' ? 'あ' : 'A'}`,
              mode,
            },
          ],
          { errorCorrectionLevel: 'L' },
        ),
      /too large/,
    );
  });
}

function testMasksAndDeterminism() {
  const signatures = new Set();
  for (let maskPattern = 0; maskPattern < 8; maskPattern += 1) {
    const options = { errorCorrectionLevel: 'M', version: 4, maskPattern };
    const first = NativeQRCode.create('MASK PARITY 1234567890', options);
    const second = NativeQRCode.create('MASK PARITY 1234567890', options);
    assert.equal(first.maskPattern, maskPattern);
    assert.equal(matrixSignature(first), matrixSignature(second));
    signatures.add(matrixSignature(first));
  }
  assert.equal(signatures.size, 8);
  assert.ok(NativeQRCode.create('AUTO MASK').maskPattern >= 0);
  assert.equal(isMaskActive(99, 0, 0), false);

  for (const maskPattern of [-1, 8, 1.5]) {
    assert.throws(
      () => NativeQRCode.create('INVALID MASK', { maskPattern }),
      (error) =>
        error instanceof RangeError &&
        error.i18nKey === 'qr.errors.maskPattern',
    );
  }
}

function testInvalidConfiguration() {
  const { MatrixBuilder } = NativeQRCode.internals;
  assert.throws(
    () => new MatrixBuilder(1, 'L', new Uint8Array(100)),
    (error) => error.i18nKey === 'qr.errors.matrixBits',
  );
  assert.throws(
    () =>
      NativeQRCode.create('INVALID LEVEL', {
        errorCorrectionLevel: 'unknown',
      }),
    (error) =>
      error.i18nKey === 'qr.errors.errorCorrectionLevel' &&
      error.i18nOptions.level === 'UNKNOWN',
  );
  for (const version of [0, 1.5, 41]) {
    assert.throws(
      () => NativeQRCode.create('INVALID VERSION', { version }),
      (error) =>
        error instanceof RangeError &&
        error.i18nKey === 'qr.errors.versionRange',
    );
  }
  assert.throws(
    () =>
      NativeQRCode.create([{ data: '123', mode: 'numeric' }], {
        version: 0,
      }),
    (error) => error.i18nKey === 'qr.errors.versionRange',
  );
  assert.equal(
    NativeQRCode.create([{ data: '123', mode: { id: 'numeric' } }], {
      version: 1,
    }).version,
    1,
  );
  assert.throws(
    () => NativeQRCode.create('a'.repeat(18), { version: 1 }),
    /Minimum version required is: 2/,
  );
  assert.throws(
    () =>
      NativeQRCode.create('a'.repeat(2954), {
        errorCorrectionLevel: 'L',
      }),
    /too large/,
  );
}

testCapacityBoundaries();
testEveryVersionAndCorrectionLevel();
testModesAndUtf8();
testBitBufferLimits();
testKanjiAndMixedModes();
testVersion40CapacityLimits();
testMasksAndDeterminism();
testInvalidConfiguration();
console.log('Native QR structural, mode, and capacity tests passed.');
