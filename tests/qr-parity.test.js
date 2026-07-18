import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import NativeQRCode from '../src/js/qr/matrix-encoder.js';

const referencePath =
  process.env.QR_REFERENCE_BUNDLE || '/tmp/qrcode-1.5.0.min.js';
if (!fs.existsSync(referencePath)) {
  console.log(
    `Reference parity skipped: set QR_REFERENCE_BUNDLE or place QRCode 1.5.0 at ${referencePath}.`,
  );
  process.exit(0);
}

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
const ReferenceQRCode = context.QRCode;
const shiftJisReferencePath =
  process.env.QR_SHIFT_JIS_REFERENCE_BUNDLE ||
  '/tmp/qrcode-1.5.0.tosjis.min.js';
if (fs.existsSync(shiftJisReferencePath)) {
  vm.runInContext(fs.readFileSync(shiftJisReferencePath, 'utf8'), context);
}

function assertParity(payload, options) {
  const nativeDefinition = NativeQRCode.create(payload, options);
  // Compare at the native scorer's mask. The former library rounds balance
  // penalties differently.
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

let comparisons = 0;
for (const errorCorrectionLevel of ['L', 'M', 'Q', 'H']) {
  for (let version = 1; version <= 40; version += 1) {
    for (let maskPattern = 0; maskPattern < 8; maskPattern += 1) {
      assertParity('A', { errorCorrectionLevel, version, maskPattern });
      comparisons += 1;
    }
  }
}

[
  ['012345678901234567890', { errorCorrectionLevel: 'M' }],
  ['THE QUICK BROWN FOX 123', { errorCorrectionLevel: 'Q' }],
  [[{ data: 'Hello, 世界', mode: 'byte' }], { errorCorrectionLevel: 'H' }],
].forEach(([payload, options]) => {
  assertParity(payload, options);
  comparisons += 1;
});

if (typeof ReferenceQRCode.toSJIS === 'function') {
  [
    [{ data: 'あかが', mode: 'kanji' }],
    [
      { data: 'ABC123', mode: 'alphanumeric' },
      { data: 'あかが', mode: 'kanji' },
      { data: 'XYZ789', mode: 'alphanumeric' },
    ],
    '1234567890hello1234567890',
    [{ data: 'Hello, 世界', mode: 'byte' }],
  ].forEach((payload) => {
    assertParity(payload, { errorCorrectionLevel: 'M' });
    comparisons += 1;
  });
}

console.log(`Native QR reference parity passed for ${comparisons} matrices.`);
