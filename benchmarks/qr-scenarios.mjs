import { create } from '../src/js/qr/matrix-encoder.js';

const repeat = (value, count) => value.repeat(count);

export const qrScenarios = [
  {
    name: 'numeric-v1-fixed-mask',
    iterations: 100,
    run: () =>
      create('012345678901234567890123456789', {
        errorCorrectionLevel: 'L',
        version: 1,
        maskPattern: 3,
      }),
  },
  {
    name: 'alphanumeric-v10-auto-mask',
    iterations: 12,
    run: () =>
      create(repeat('QR BENCHMARK 123 ', 6), {
        errorCorrectionLevel: 'Q',
        version: 10,
      }),
  },
  {
    name: 'byte-v20-fixed-mask',
    iterations: 6,
    run: () =>
      create(repeat('lowercase payload ', 25), {
        errorCorrectionLevel: 'M',
        version: 20,
        maskPattern: 5,
      }),
  },
  {
    name: 'byte-v20-auto-mask',
    iterations: 3,
    run: () =>
      create(repeat('lowercase payload ', 25), {
        errorCorrectionLevel: 'M',
        version: 20,
      }),
  },
  {
    name: 'byte-v40-auto-mask',
    iterations: 1,
    run: () =>
      create(repeat('binary-like-data-0123456789/', 65), {
        errorCorrectionLevel: 'L',
        version: 40,
      }),
  },
  {
    name: 'mixed-auto-version',
    iterations: 15,
    run: () =>
      create(repeat('1234567890hello-WORLD-12345', 8), {
        errorCorrectionLevel: 'M',
      }),
  },
  {
    name: 'kanji-v10-fixed-mask',
    iterations: 8,
    run: () =>
      create([{ data: repeat('あかが', 30), mode: 'kanji' }], {
        errorCorrectionLevel: 'M',
        version: 10,
        maskPattern: 2,
      }),
  },
];

export function initializeKanji() {
  return create([{ data: 'あ', mode: 'kanji' }], {
    errorCorrectionLevel: 'L',
    version: 1,
    maskPattern: 0,
  });
}
