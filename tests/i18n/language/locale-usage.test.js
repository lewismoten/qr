import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { test } from 'node:test';

import { readLocaleSource } from '../../helpers/locales.js';

const sourceRoots = [
  new URL('../../../src/js/', import.meta.url),
  new URL('../../../src/html/', import.meta.url),
];
const textExtensions = new Set(['.html', '.js']);

function getExtension(name) {
  const dot = name.lastIndexOf('.');
  return dot < 0 ? '' : name.slice(dot);
}

async function readSourceText(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const contents = await Promise.all(
    entries.map(async (entry) => {
      const url = new URL(entry.name, directory);
      if (entry.isDirectory()) {
        return readSourceText(new URL(`${entry.name}/`, directory));
      }
      if (!textExtensions.has(getExtension(entry.name))) return [];
      return [await readFile(url, 'utf8')];
    }),
  );
  return contents.flat();
}

function escapePattern(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getDynamicKeyPatterns(source) {
  const patterns = [];
  for (const match of source.matchAll(/`([^`]*\$\{[^`]+)`/gs)) {
    const template = match[1];
    if (!template.includes('.')) continue;
    const parts = template.split(/\$\{[^}]+\}/g).map(escapePattern);
    patterns.push(new RegExp(`^${parts.join('[^.]+')}$`));
  }
  return patterns;
}

function getLeafPaths(value, prefix = '', paths = []) {
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === 'object' && !Array.isArray(child)) {
      getLeafPaths(child, path, paths);
    } else {
      paths.push(path);
    }
  }
  return paths;
}

test('every en-US locale key is referenced under src', async () => {
  const [locale, sourceFiles] = await Promise.all([
    readLocaleSource('en-US'),
    Promise.all(sourceRoots.map(readSourceText)).then((files) => files.flat()),
  ]);
  const source = sourceFiles.join('\n');
  const patterns = getDynamicKeyPatterns(source);
  const orphaned = getLeafPaths(locale).filter(
    (key) =>
      !source.includes(key) && !patterns.some((pattern) => pattern.test(key)),
  );

  assert.deepEqual(
    orphaned,
    [],
    'Remove unused en-US values or reference their complete key under src.',
  );
});
