import assert from 'node:assert/strict';
import {
  parseBoolean,
  parseCsv,
  parseCsvAsync,
} from '../../src/js/app/data/csv.js';

assert.equal(parseBoolean(''), false);
assert.equal(parseBoolean('', { allowBlank: false }), null);
for (const value of ['true', 'TRUE', '1', 'yes', 'y']) {
  assert.equal(parseBoolean(value), true);
}
for (const value of ['false', 'FALSE', '0', 'no', 'n']) {
  assert.equal(parseBoolean(value), false);
}
assert.equal(parseBoolean('maybe'), null);

assert.deepEqual(parseCsv(''), []);
assert.deepEqual(parseCsv('one,two'), [['one', 'two']]);
assert.deepEqual(parseCsv('one\rtwo\nthree\r\nfour'), [
  ['one'],
  ['two'],
  ['three'],
  ['four'],
]);
assert.deepEqual(parseCsv('name,notes\nLewis,"line one\nline two"\n\n'), [
  ['name', 'notes'],
  ['Lewis', 'line one\nline two'],
]);
assert.throws(
  () => parseCsv('name\n"unclosed'),
  (error) => error.i18nKey === 'bulk.csv.unclosedQuote',
);

const source =
  'name,notes\r\n"Moten, Lewis","line ""one"""\r\nTaylor,plain\r\n';
assert.deepEqual(
  await parseCsvAsync(source, { yieldEvery: 4 }),
  parseCsv(source),
);

const progress = [];
await parseCsvAsync(source, {
  yieldEvery: 4,
  onProgress: (current, total) => progress.push([current, total]),
});
assert.deepEqual(progress.at(-1), [source.length, source.length]);
assert.ok(progress.length > 1);
await assert.rejects(
  parseCsvAsync('name\n"unclosed', { yieldEvery: 2 }),
  (error) => error.i18nKey === 'bulk.csv.unclosedQuote',
);

const controller = new AbortController();
controller.abort();
await assert.rejects(
  parseCsvAsync(source, { signal: controller.signal, yieldEvery: 1 }),
  {
    name: 'AbortError',
  },
);

console.log('Asynchronous CSV parsing tests passed.');
