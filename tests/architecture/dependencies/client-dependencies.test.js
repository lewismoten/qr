import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { relative } from 'node:path';
import test from 'node:test';

import { parse } from 'espree';

const CLIENT_ROOT = new URL('../../../src/js/', import.meta.url);
const REPOSITORY_ROOT = new URL('../../../', import.meta.url);
const ALLOWED_EXTERNAL_SPECIFIERS = new Set(['@lewismoten/qr']);

async function findJavaScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const suffix = entry.isDirectory() ? '/' : '';
      const url = new URL(`${entry.name}${suffix}`, directory);
      if (entry.isDirectory()) return findJavaScriptFiles(url);
      return entry.isFile() && entry.name.endsWith('.js') ? [url] : [];
    }),
  );
  return nested.flat();
}

function walk(node, visit) {
  if (!node || typeof node !== 'object') return;
  visit(node);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach((child) => walk(child, visit));
    else if (value?.type) walk(value, visit);
  }
}

function getModuleSources(source) {
  const ast = parse(source, {
    ecmaVersion: 'latest',
    sourceType: 'module',
    loc: true,
  });
  const dependencies = [];
  walk(ast, (node) => {
    if (
      node.type === 'ImportDeclaration' ||
      node.type === 'ExportAllDeclaration' ||
      (node.type === 'ExportNamedDeclaration' && node.source)
    ) {
      dependencies.push(node.source);
    } else if (node.type === 'ImportExpression') {
      dependencies.push(node.source);
    }
  });
  return dependencies;
}

function isLocalSpecifier(specifier) {
  return (
    specifier.startsWith('./') ||
    specifier.startsWith('../') ||
    specifier.startsWith('/')
  );
}

function describeFile(file) {
  return relative(REPOSITORY_ROOT.pathname, file.pathname);
}

function findSourceExternalDependencies(source) {
  return getModuleSources(source).flatMap((dependency) => {
    const specifier =
      dependency.type === 'Literal' ? dependency.value : undefined;
    if (typeof specifier !== 'string') {
      return [
        {
          specifier: '<non-literal dynamic import>',
          line: dependency.loc.start.line,
        },
      ];
    }
    if (
      isLocalSpecifier(specifier) ||
      ALLOWED_EXTERNAL_SPECIFIERS.has(specifier)
    ) {
      return [];
    }
    return [{ specifier, line: dependency.loc.start.line }];
  });
}

async function findExternalDependencies() {
  const violations = [];
  const files = await findJavaScriptFiles(CLIENT_ROOT);
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    for (const violation of findSourceExternalDependencies(source)) {
      const location = `${describeFile(file)}:${violation.line}`;
      violations.push(`${location} imports ${violation.specifier}`);
    }
  }
  return violations;
}

test('client JavaScript has no external runtime dependencies', async () => {
  const violations = await findExternalDependencies();
  assert.deepEqual(
    violations,
    [],
    'Use local modules or the permitted @lewismoten/qr import-map alias.\n' +
      violations.join('\n'),
  );
});

test('dependency guard recognizes every supported module expression', () => {
  assert.deepEqual(
    findSourceExternalDependencies(`
      import value from 'example-package';
      export { helper } from 'another-package';
      export * from 'https://cdn.example/module.js';
      import(moduleName);
    `).map(({ specifier }) => specifier),
    [
      'example-package',
      'another-package',
      'https://cdn.example/module.js',
      '<non-literal dynamic import>',
    ],
  );
  assert.deepEqual(
    findSourceExternalDependencies(`
      import qr from '@lewismoten/qr';
      import './local.js';
      export * from '../shared.js';
      import('/dist/client.js');
    `).map(({ specifier }) => specifier),
    [],
  );
});
