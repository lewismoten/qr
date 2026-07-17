'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const NativeQRCode = require('./qr-native.js');

const referencePath = process.env.QR_REFERENCE_BUNDLE || '/tmp/qrcode-1.5.0.min.js';
if (!fs.existsSync(referencePath)) {
  console.log(`Reference parity skipped: set QR_REFERENCE_BUNDLE or place QRCode 1.5.0 at ${referencePath}.`);
  process.exit(0);
}

const context = { TextEncoder, TextDecoder, Uint8Array, ArrayBuffer, setTimeout, clearTimeout, console };
context.globalThis = context;
context.window = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(referencePath, 'utf8'), context);
const ReferenceQRCode = context.QRCode;

function moduleIsDark(definition, row, column) {
  return Boolean(
    typeof definition.modules.get === 'function'
      ? definition.modules.get(row, column)
      : definition.modules.data[row * definition.modules.size + column]
  );
}

function assertParity(payload, options) {
  const nativeDefinition = NativeQRCode.create(payload, options);
  const referenceDefinition = ReferenceQRCode.create(payload, options);
  assert.equal(nativeDefinition.version, referenceDefinition.version, 'version');
  assert.equal(nativeDefinition.maskPattern, referenceDefinition.maskPattern, 'mask');
  assert.equal(nativeDefinition.modules.size, referenceDefinition.modules.size, 'matrix size');
  for (let row = 0; row < nativeDefinition.modules.size; row += 1) {
    for (let column = 0; column < nativeDefinition.modules.size; column += 1) {
      assert.equal(
        moduleIsDark(nativeDefinition, row, column),
        moduleIsDark(referenceDefinition, row, column),
        `module ${row},${column}`
      );
    }
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

console.log(`Native QR reference parity passed for ${comparisons} matrices.`);
