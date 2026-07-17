import assert from 'node:assert/strict';
import { pushUint16LE, pushUint32LE } from '../src/js/app/bytes.js';

const bytes = [];
pushUint16LE(bytes, 0x1234);
pushUint32LE(bytes, 0x89abcdef);

assert.deepEqual(bytes, [0x34, 0x12, 0xef, 0xcd, 0xab, 0x89]);

console.log('Byte serialization tests passed.');
