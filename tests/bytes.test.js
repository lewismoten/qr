import assert from 'node:assert/strict';
import {
  concatBytes,
  formatBytes,
  hexToBytes,
  pushUint16LE,
  pushUint32LE,
  textBytes,
  uint64Bytes,
} from '../src/js/app/bytes.js';

const bytes = [];
pushUint16LE(bytes, 0x1234);
pushUint32LE(bytes, 0x89abcdef);

assert.deepEqual(bytes, [0x34, 0x12, 0xef, 0xcd, 0xab, 0x89]);
assert.deepEqual(
  concatBytes([Uint8Array.of(1, 2), Uint8Array.of(), Uint8Array.of(3)]),
  Uint8Array.of(1, 2, 3),
);
assert.deepEqual(textBytes('A€'), Uint8Array.of(0x41, 0xe2, 0x82, 0xac));
assert.equal(formatBytes(Number.NaN), '0 B');
assert.equal(formatBytes(-1), '0 B');
assert.equal(formatBytes(0), '0 B');
assert.equal(formatBytes(1023), '1023 B');
assert.equal(formatBytes(1024), '1.0 KB');
assert.equal(formatBytes(10 * 1024), '10 KB');
assert.equal(formatBytes(1.5 * 1024 * 1024), '1.5 MB');
assert.equal(formatBytes(2 * 1024 ** 3), '2.0 GB');
assert.deepEqual(hexToBytes('00ff10'), Uint8Array.of(0, 255, 16));
assert.deepEqual(
  uint64Bytes(0x01020304050607),
  Uint8Array.of(0, 1, 2, 3, 4, 5, 6, 7),
);
assert.deepEqual(uint64Bytes(-10), new Uint8Array(8));
assert.deepEqual(uint64Bytes(), new Uint8Array(8));

console.log('Byte serialization tests passed.');
