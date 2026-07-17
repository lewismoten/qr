import assert from 'node:assert/strict';
import NativeQRCode from './src/js/qr/index.js';

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
    assert.equal(NativeQRCode.create([{ data: maximum, mode }], { errorCorrectionLevel: 'L' }).version, 1);
    assert.equal(NativeQRCode.create([{ data: overflow, mode }], { errorCorrectionLevel: 'L' }).version, 2);
  });
  assert.equal(NativeQRCode.create([{ data: 'A'.repeat(14), mode: 'byte' }], { errorCorrectionLevel: 'M' }).version, 1);
  assert.throws(
    () => NativeQRCode.create([{ data: 'A'.repeat(18), mode: 'byte' }], { errorCorrectionLevel: 'L', version: 1 }),
    /Minimum version required is: 2/
  );
}

function testEveryVersionAndCorrectionLevel() {
  for (const errorCorrectionLevel of ['L', 'M', 'Q', 'H']) {
    for (let version = 1; version <= 40; version += 1) {
      const definition = NativeQRCode.create('A', { errorCorrectionLevel, version, maskPattern: 0 });
      assert.equal(definition.version, version);
      assert.equal(definition.modules.size, version * 4 + 17);
      assert.equal(definition.modules.data.length, definition.modules.size ** 2);
      assert.ok([...definition.modules.data].every((module) => module === 0 || module === 1));
      assert.equal(definition.modules.get(3, 3), true, `finder center V${version}-${errorCorrectionLevel}`);
      assert.equal(definition.modules.get(definition.modules.size - 8, 8), true, `dark module V${version}-${errorCorrectionLevel}`);
    }
  }
}

function testModesAndUtf8() {
  assert.equal(NativeQRCode.create('12345').segments[0].mode, 'numeric');
  assert.equal(NativeQRCode.create('HELLO WORLD').segments[0].mode, 'alphanumeric');
  const utf8 = NativeQRCode.create('Hello, 世界');
  assert.deepEqual(utf8.segments.map(({ mode }) => mode), ['byte', 'kanji']);
  assert.equal(utf8.segments[0].characterCount, 7);
  assert.equal(utf8.segments[0].getBitsLength(), 56);
  assert.equal(utf8.segments[1].getBitsLength(), 26);
  assert.throws(() => NativeQRCode.create([{ data: '12-A', mode: 'numeric' }]), /only accepts digits/);
}

function testKanjiAndMixedModes() {
  const kanji = NativeQRCode.create([{ data: 'あかが', mode: 'kanji' }], { errorCorrectionLevel: 'M' });
  assert.equal(kanji.segments[0].characterCount, 3);
  assert.equal(kanji.segments[0].getBitsLength(), 39);
  assert.equal(NativeQRCode.toSJIS('あ'), 0x82a0);
  assert.throws(() => NativeQRCode.create([{ data: 'QRあ', mode: 'kanji' }]), /outside the QR Shift JIS ranges/);

  const mixed = NativeQRCode.create('ABC123あかがXYZ789');
  assert.deepEqual(mixed.segments.map(({ mode }) => mode), ['alphanumeric', 'kanji', 'alphanumeric']);
  assert.deepEqual(mixed.segments.map(({ data }) => data), ['ABC123', 'あかが', 'XYZ789']);
}

function testVersion40CapacityLimits() {
  const maximums = [
    ['numeric', '1'.repeat(7089)],
    ['alphanumeric', 'A'.repeat(4296)],
    ['byte', 'a'.repeat(2953)],
    ['kanji', 'あ'.repeat(1817)],
  ];
  maximums.forEach(([mode, payload]) => {
    assert.equal(NativeQRCode.create([{ data: payload, mode }], { errorCorrectionLevel: 'L' }).version, 40);
    assert.throws(
      () => NativeQRCode.create([{ data: `${payload}${mode === 'numeric' ? '1' : mode === 'kanji' ? 'あ' : 'A'}`, mode }], { errorCorrectionLevel: 'L' }),
      /too large/
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
}

testCapacityBoundaries();
testEveryVersionAndCorrectionLevel();
testModesAndUtf8();
testKanjiAndMixedModes();
testVersion40CapacityLimits();
testMasksAndDeterminism();
console.log('Native QR structural, mode, and capacity tests passed.');
