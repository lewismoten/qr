import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { isAbsolute, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const qrRoot = new URL('../src/js/qr/', import.meta.url);
const qrApi = new URL('../src/js/qr-api.js', import.meta.url);
const staticModulePattern =
  /\b(?:import|export)\s+(?:[^'";]*?\sfrom\s*)?['"]([^'"]+)['"]/g;
const dynamicModulePattern = /\bimport\s*\(\s*([^)]*)\)/g;
const literalSpecifierPattern = /^(['"])([^'"]+)\1\s*$/;

async function findJavaScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const url = new URL(entry.name, directory);
      if (entry.isDirectory()) return findJavaScriptFiles(url);
      return entry.isFile() && entry.name.endsWith('.js') ? [url] : [];
    }),
  );
  return nested.flat();
}

async function getSpecifiers(file) {
  const source = await readFile(file, 'utf8');
  const staticSpecifiers = [...source.matchAll(staticModulePattern)].map(
    (match) => match[1],
  );
  const dynamicSpecifiers = [...source.matchAll(dynamicModulePattern)].map(
    (match) => match[1].match(literalSpecifierPattern)?.[2] || null,
  );
  return [...staticSpecifiers, ...dynamicSpecifiers];
}

function isWithin(directory, file) {
  const path = relative(fileURLToPath(directory), fileURLToPath(file));
  return path === '' || (!path.startsWith('..') && !isAbsolute(path));
}

async function findBoundaryViolations(files, allowedRoot) {
  const violations = [];
  for (const file of files) {
    const specifiers = await getSpecifiers(file);
    for (const specifier of specifiers) {
      if (!specifier) {
        violations.push(`${file.pathname} has a non-literal dynamic import`);
        continue;
      }
      if (!specifier.startsWith('.')) {
        violations.push(`${file.pathname} imports ${specifier}`);
        continue;
      }
      const dependency = new URL(specifier, file);
      if (!isWithin(allowedRoot, dependency)) {
        violations.push(`${file.pathname} imports ${dependency.pathname}`);
      }
    }
  }
  return violations;
}

test('QR implementation imports stay within src/js/qr', async () => {
  const files = await findJavaScriptFiles(qrRoot);
  assert.deepEqual(await findBoundaryViolations(files, qrRoot), []);
});

test('qr-api imports only the QR implementation', async () => {
  assert.deepEqual(await findBoundaryViolations([qrApi], qrRoot), []);
});
