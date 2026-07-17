import assert from 'node:assert/strict';
import { normalizeModeName } from './src/js/app/modes.js';

assert.equal(normalizeModeName('Numeric'), 'numeric');
assert.equal(normalizeModeName({ id: 'Alphanumeric' }), 'alphanumeric');
assert.equal(normalizeModeName({ name: 'KANJI' }), 'kanji');
assert.equal(normalizeModeName(null), 'byte');
assert.equal(normalizeModeName({}, 'mixed'), 'mixed');

console.log('QR mode normalization tests passed.');
