import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import NativeQRCode from '../../src/js/qr/matrix-encoder.js';

const referencePath =
  process.env.QR_REFERENCE_BUNDLE || '/tmp/qrcode-1.5.0.min.js';
const shiftJisReferencePath =
  process.env.QR_SHIFT_JIS_REFERENCE_BUNDLE ||
  '/tmp/qrcode-1.5.0.tosjis.min.js';

function loadReference() {
  if (!fs.existsSync(referencePath)) return null;
  const context = {
    TextEncoder,
    TextDecoder,
    Uint8Array,
    ArrayBuffer,
    setTimeout,
    clearTimeout,
    console,
  };
  context.globalThis = context;
  context.window = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(referencePath, 'utf8'), context);
  if (fs.existsSync(shiftJisReferencePath)) {
    vm.runInContext(fs.readFileSync(shiftJisReferencePath, 'utf8'), context);
  }
  return context.QRCode;
}

const ReferenceQRCode = loadReference();

function assertParity(payload, options) {
  const nativeDefinition = NativeQRCode.create(payload, options);
  const referenceOptions =
    typeof ReferenceQRCode.toSJIS === 'function'
      ? {
          ...options,
          maskPattern: nativeDefinition.maskPattern,
          toSJISFunc: ReferenceQRCode.toSJIS,
        }
      : { ...options, maskPattern: nativeDefinition.maskPattern };
  const referenceDefinition = ReferenceQRCode.create(payload, referenceOptions);
  assert.equal(
    nativeDefinition.version,
    referenceDefinition.version,
    'version',
  );
  assert.equal(
    nativeDefinition.maskPattern,
    referenceDefinition.maskPattern,
    'mask',
  );
  assert.equal(
    nativeDefinition.modules.size,
    referenceDefinition.modules.size,
    'matrix size',
  );
  const nativeModules = Buffer.from(nativeDefinition.modules.data);
  const referenceModules = Buffer.from(referenceDefinition.modules.data);
  if (!nativeModules.equals(referenceModules)) {
    const index = nativeModules.findIndex(
      (module, moduleIndex) => module !== referenceModules[moduleIndex],
    );
    const row = Math.floor(index / nativeDefinition.modules.size);
    const column = index % nativeDefinition.modules.size;
    assert.fail(`module ${row},${column}`);
  }
}

function runSupplementalParity() {
  let comparisons = 0;
  for (const [payload, options] of [
    ['012345678901234567890', { errorCorrectionLevel: 'M' }],
    ['THE QUICK BROWN FOX 123', { errorCorrectionLevel: 'Q' }],
    [[{ data: 'Hello, 世界', mode: 'byte' }], { errorCorrectionLevel: 'H' }],
  ]) {
    assertParity(payload, options);
    comparisons += 1;
  }
  if (typeof ReferenceQRCode.toSJIS === 'function') {
    for (const payload of [
      [{ data: 'あかが', mode: 'kanji' }],
      [
        { data: 'ABC123', mode: 'alphanumeric' },
        { data: 'あかが', mode: 'kanji' },
        { data: 'XYZ789', mode: 'alphanumeric' },
      ],
      '1234567890hello1234567890',
      [{ data: 'Hello, 世界', mode: 'byte' }],
    ]) {
      assertParity(payload, { errorCorrectionLevel: 'M' });
      comparisons += 1;
    }
  }
  return comparisons;
}

export function runParityLevel(errorCorrectionLevel, supplemental = false) {
  if (!ReferenceQRCode) {
    console.log(
      'Reference parity skipped: set QR_REFERENCE_BUNDLE or place ' +
        `QRCode 1.5.0 at ${referencePath}.`,
    );
    return;
  }
  let comparisons = 0;
  for (let version = 1; version <= 40; version += 1) {
    for (let maskPattern = 0; maskPattern < 8; maskPattern += 1) {
      assertParity('A', { errorCorrectionLevel, version, maskPattern });
      comparisons += 1;
    }
  }
  if (supplemental) comparisons += runSupplementalParity();
  console.log(
    `${errorCorrectionLevel} parity passed for ${comparisons} matrices.`,
  );
}
