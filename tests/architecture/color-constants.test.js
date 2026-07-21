import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const KNOWN_COLORS = /['"]#(?:000000|ffffff|111827|0f766e|0ea5e9|60a5fa)['"]/gi;
const MEDIA_TYPE_LITERAL = /['"](?:application|image|text)\/[a-z0-9.+-]+['"]/gi;

async function findJavaScript(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) return findJavaScript(target);
      return entry.name.endsWith('.js') ? [target] : [];
    }),
  );
  return files.flat();
}

test('app code imports canonical colors instead of repeating hex values', async () => {
  const root = path.resolve('src/js/app');
  const definition = path.join(root, 'colors.js');
  const violations = [];
  for (const file of await findJavaScript(root)) {
    if (file === definition) continue;
    const source = await readFile(file, 'utf8');
    if (KNOWN_COLORS.test(source)) violations.push(path.relative(root, file));
    KNOWN_COLORS.lastIndex = 0;
  }
  assert.deepEqual(violations, []);
});

test('app code imports exact MIME types from the registry', async () => {
  const root = path.resolve('src/js/app');
  const definition = path.join(root, 'media-types.js');
  const violations = [];
  for (const file of await findJavaScript(root)) {
    if (file === definition) continue;
    const source = await readFile(file, 'utf8');
    if (MEDIA_TYPE_LITERAL.test(source)) {
      violations.push(path.relative(root, file));
    }
    MEDIA_TYPE_LITERAL.lastIndex = 0;
  }
  assert.deepEqual(violations, []);
});
