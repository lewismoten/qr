import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { test } from 'node:test';
import QrCode from '../../src/js/qr/matrix-encoder.js';

const dangerousSinks = [
  ['dynamic code evaluation', /\beval\s*\(|\bnew\s+Function\s*\(/],
  [
    'HTML string injection',
    /\.(?:innerHTML|outerHTML)\s*=|\binsertAdjacentHTML\s*\(/,
  ],
  ['document stream injection', /\bdocument\.write(?:ln)?\s*\(/],
  ['inline event-handler injection', /setAttribute\(\s*['"]on[a-z]+['"]/],
];

async function findJavaScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const suffix = entry.isDirectory() ? '/' : '';
      const url = new URL(`${entry.name}${suffix}`, directory);
      if (entry.isDirectory()) return findJavaScriptFiles(url);
      return entry.isFile() && entry.name.endsWith('.js') ? [url] : [];
    }),
  );
  return files.flat();
}

test('oversized QR inputs fail before expensive encoding', () => {
  const oversizedText = '1'.repeat(100_000);
  assert.throws(
    () => QrCode.create(oversizedText),
    (error) => error.source === 'qr' && error.key === 'contentTooLong',
  );

  const excessiveSegments = Array.from({ length: 10_000 }, () => ({
    data: '',
    mode: 'byte',
  }));
  assert.throws(
    () => QrCode.create(excessiveSegments),
    (error) => error.source === 'qr' && error.key === 'tooManySegments',
  );

  const excessiveCombinedLength = [
    { data: '1'.repeat(4000), mode: 'numeric' },
    { data: '2'.repeat(4000), mode: 'numeric' },
  ];
  assert.throws(
    () => QrCode.create(excessiveCombinedLength),
    (error) => error.source === 'qr' && error.key === 'contentTooLong',
  );
});

test('prototype pollution cannot control QR options', () => {
  const inheritedOptions = Object.create({
    errorCorrectionLevel: 'INVALID',
    maskPattern: 99,
    version: 0,
  });
  const definition = QrCode.create('SAFE', inheritedOptions);
  assert.equal(definition.errorCorrectionLevel, 'M');
  assert.ok(definition.maskPattern >= 0 && definition.maskPattern <= 7);
  assert.equal(QrCode.create('SAFE', null).version, definition.version);
  assert.equal(
    QrCode.create('SAFE', { errorCorrectionLevel: '' }).errorCorrectionLevel,
    'M',
  );
});

test('untrusted text remains data and does not alter objects', () => {
  const marker = {};
  const payload = '<script>alert(1)</script>\0__proto__=polluted';
  const definition = QrCode.create(payload);
  assert.equal(definition.segments.map(({ data }) => data).join(''), payload);
  assert.equal(marker.polluted, undefined);
  assert.equal(Object.prototype.polluted, undefined);
});

test('invalid matrix versions fail before allocation', () => {
  const { MatrixBuilder } = QrCode.internals;
  for (const version of [-1, 1.5, 41, Number.MAX_SAFE_INTEGER]) {
    assert.throws(
      () => new MatrixBuilder(version, 'L', []),
      (error) => error instanceof RangeError && error.key === 'versionRange',
    );
  }
});

test('browser source avoids executable-string and HTML sinks', async () => {
  const root = new URL('../../src/js/', import.meta.url);
  const files = await findJavaScriptFiles(root);
  const violations = [];
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    dangerousSinks.forEach(([description, pattern]) => {
      if (pattern.test(source)) {
        violations.push(`${file.pathname}: ${description}`);
      }
    });
  }
  assert.deepEqual(violations, []);
});
