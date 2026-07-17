import assert from 'node:assert/strict';
import { getCrc32 } from './src/js/app/checksum/crc32.js';
import { createZipBlob } from './src/js/app/zip.js';

function uint16(bytes, offset) {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function uint32(bytes, offset) {
  return (bytes[offset]
    | (bytes[offset + 1] << 8)
    | (bytes[offset + 2] << 16)
    | (bytes[offset + 3] << 24)) >>> 0;
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
assert.equal(uint32(bytes, bytes.length - 22), 0x06054b50, 'end-of-central-directory signature');
assert.equal(getCrc32(standardVector), 0xcbf43926, 'standard CRC-32 check value');

console.log('Export format tests passed.');
