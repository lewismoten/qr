import assert from 'node:assert/strict';
import { getCrc32 } from '../../src/js/app/checksum/crc32.js';
import { canvasToBlob } from '../../src/js/app/export/canvas-export.js';
import { createZipBlob } from '../../src/js/app/export/zip.js';

function uint16(bytes, offset) {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function uint32(bytes, offset) {
  return (
    (bytes[offset] |
      (bytes[offset + 1] << 8) |
      (bytes[offset + 2] << 16) |
      (bytes[offset + 3] << 24)) >>>
    0
  );
}

const payload = new TextEncoder().encode('QR export');
const standardVector = new TextEncoder().encode('123456789');
const archive = await createZipBlob([
  { name: 'qr-code.png', blob: new Blob([payload], { type: 'image/png' }) },
]);
const bytes = new Uint8Array(await archive.arrayBuffer());

assert.equal(uint32(bytes, 0), 0x04034b50, 'local file header signature');
assert.equal(uint16(bytes, 6), 0x0800, 'UTF-8 file-name flag');
assert.equal(uint16(bytes, 8), 0, 'stored compression method');
assert.equal(uint32(bytes, 14), getCrc32(payload), 'CRC-32 checksum');
assert.equal(uint32(bytes, 18), payload.length, 'compressed size');
assert.equal(uint32(bytes, 22), payload.length, 'uncompressed size');
assert.equal(
  uint32(bytes, bytes.length - 22),
  0x06054b50,
  'end-of-central-directory signature',
);
assert.equal(
  getCrc32(standardVector),
  0xcbf43926,
  'standard CRC-32 check value',
);

const progress = [];
await createZipBlob(
  [
    { name: 'first.txt', blob: new Blob(['first']) },
    { name: 'second.txt', blob: new Blob(['second']) },
  ],
  { onProgress: (completed, total) => progress.push([completed, total]) },
);
assert.deepEqual(progress, [
  [1, 2],
  [2, 2],
]);

const canceled = new AbortController();
canceled.abort();
await assert.rejects(
  createZipBlob([{ name: 'canceled.txt', blob: new Blob(['data']) }], {
    signal: canceled.signal,
  }),
  { name: 'AbortError' },
);

const originalDocument = globalThis.document;
const calls = [];
const exportCanvas = {
  getContext: () => ({
    set fillStyle(value) {
      calls.push(['fillStyle', value]);
    },
    fillRect: (...values) => calls.push(['fillRect', ...values]),
    drawImage: (...values) => calls.push(['drawImage', ...values]),
  }),
  toBlob(callback, type, quality) {
    calls.push(['toBlob', type, quality]);
    callback(new Blob(['flattened'], { type }));
  },
};
globalThis.document = {
  createElement(tag) {
    assert.equal(tag, 'canvas');
    return exportCanvas;
  },
};
const sourceCanvas = { width: 12, height: 8 };
const flattened = await canvasToBlob(sourceCanvas, 'image/jpeg', 0.75, true);
assert.equal(flattened.type, 'image/jpeg');
assert.equal(exportCanvas.width, sourceCanvas.width);
assert.equal(exportCanvas.height, sourceCanvas.height);
assert.deepEqual(calls, [
  ['fillStyle', '#ffffff'],
  ['fillRect', 0, 0, 12, 8],
  ['drawImage', sourceCanvas, 0, 0],
  ['toBlob', 'image/jpeg', 0.75],
]);

const directCanvas = {
  toBlob(callback, type, quality) {
    assert.equal(type, 'image/png');
    assert.equal(quality, 1);
    callback(new Blob(['direct'], { type }));
  },
};
assert.equal(
  (await canvasToBlob(directCanvas, 'image/png', 1)).type,
  'image/png',
);
await assert.rejects(
  canvasToBlob(
    { toBlob: (callback) => callback(null) },
    'image/unsupported',
    1,
  ),
  (error) =>
    error.i18nKey === 'download.imageError' &&
    error.i18nOptions.type === 'image/unsupported',
);
globalThis.document = originalDocument;

console.log('Export format tests passed.');
