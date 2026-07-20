import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const repositoryRoot = path.resolve(import.meta.dirname, '../..');
const ignoredDirectories = new Set([
  '.cache',
  '.git',
  'build',
  'dist',
  'locales',
  'node_modules',
  'translations',
]);

async function collectFiles(directory, files = []) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await collectFiles(absolutePath, files);
    } else if (entry.isFile()) {
      files.push(path.relative(repositoryRoot, absolutePath));
    }
  }
  return files;
}

test('repository filenames are unique across folders', async () => {
  const filesByName = new Map();
  const files = await collectFiles(repositoryRoot);
  for (const file of files) {
    const filename = path.basename(file);
    const matches = filesByName.get(filename) ?? [];
    matches.push(file);
    filesByName.set(filename, matches);
  }

  const duplicates = [...filesByName]
    .filter(([, matches]) => matches.length > 1)
    .sort(([left], [right]) => left.localeCompare(right));
  const details = duplicates
    .map(([filename, matches]) => `${filename}:\n  ${matches.join('\n  ')}`)
    .join('\n');

  assert.deepEqual(
    duplicates,
    [],
    `Filenames must be unique across folders.\n${details}`,
  );
});
