import assert from 'node:assert/strict';

import NativeQRCode from '../../src/js/qr/matrix-encoder.js';

for (const errorCorrectionLevel of ['L', 'M']) {
  for (let version = 1; version <= 40; version += 1) {
    const definition = NativeQRCode.create('A', {
      errorCorrectionLevel,
      version,
      maskPattern: 0,
    });
    assert.equal(definition.version, version);
    assert.equal(definition.modules.size, version * 4 + 17);
    assert.equal(definition.modules.data.length, definition.modules.size ** 2);
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
