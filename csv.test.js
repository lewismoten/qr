import assert from 'node:assert/strict';
import { parseCsv, parseCsvAsync } from './src/js/app/csv.js';

const source = 'name,notes\r\n"Moten, Lewis","line ""one"""\r\nTaylor,plain\r\n';
assert.deepEqual(await parseCsvAsync(source, { yieldEvery: 4 }), parseCsv(source));

const controller = new AbortController();
controller.abort();
await assert.rejects(parseCsvAsync(source, { signal: controller.signal, yieldEvery: 1 }), {
  name: 'AbortError',
});

console.log('Asynchronous CSV parsing tests passed.');
