import assert from 'node:assert/strict';

import NativeQRCode from '../../src/js/qr/matrix-encoder.js';

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
            data:
              payload +
              (mode === 'numeric' ? '1' : mode === 'kanji' ? 'あ' : 'A'),
            mode,
          },
        ],
        { errorCorrectionLevel: 'L' },
      ),
    (error) =>
      error.source === 'qr' &&
      ['contentTooLong', 'tooLarge'].includes(error.key),
  );
});
