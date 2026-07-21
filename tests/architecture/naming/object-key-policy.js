import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';

import { parse } from 'espree';

const root = process.cwd();
const rules = JSON.parse(
  await readFile(join(root, 'config/object-key-rules.json'), 'utf8'),
);
const ignoredDirectories = new Set([
  '.cache',
  '.git',
  'build',
  'dist',
  'node_modules',
]);
const externalJsonFiles = new Set([
  '.vscode/settings.json',
  'config/htmlhint.json',
  'config/markdownlint.json',
  'config/prettier.json',
  'config/stylelint.json',
  'package-lock.json',
  'package.json',
]);
const identifierPattern = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
const camelCasePattern = /^[a-z][A-Za-z0-9]*$/;

export async function findFiles(directory, extensions) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        return ignoredDirectories.has(entry.name)
          ? []
          : findFiles(path, extensions);
      }
      return extensions.has(entry.name.slice(entry.name.lastIndexOf('.')))
        ? [path]
        : [];
    }),
  );
  return nested.flat();
}

function getReasons(key) {
  const reasons = [];
  if (key.length > rules.maximumLength) reasons.push('length');
  if (!identifierPattern.test(key)) reasons.push('identifierSafe');
  else if (!camelCasePattern.test(key)) reasons.push('lowerCamelCase');
  return reasons;
}

function getStaticPropertyKey(property) {
  if (property.type !== 'Property') return null;
  if (!property.computed && property.key.type === 'Identifier') {
    return property.key.name;
  }
  if (property.key.type === 'Literal') return String(property.key.value);
  return null;
}

export function collectJavascriptViolations(source) {
  const ast = parse(source, {
    ecmaVersion: 'latest',
    sourceType: 'module',
  });
  const violations = [];
  function visit(node) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'ObjectExpression') {
      for (const property of node.properties) {
        const key = getStaticPropertyKey(property);
        if (key === null) continue;
        for (const reason of getReasons(key)) {
          violations.push(`javascript|${reason}|${key}`);
        }
      }
    }
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(visit);
      else visit(value);
    }
  }
  visit(ast);
  return violations;
}

export function collectJsonViolations(value, violations = []) {
  if (!value || typeof value !== 'object') return violations;
  if (Array.isArray(value)) {
    value.forEach((item) => collectJsonViolations(item, violations));
    return violations;
  }
  for (const [key, nested] of Object.entries(value)) {
    for (const reason of getReasons(key)) {
      violations.push(`json|${reason}|${key}`);
    }
    collectJsonViolations(nested, violations);
  }
  return violations;
}

export function isCheckedJsonFile(file) {
  const path = relative(root, file);
  return (
    !externalJsonFiles.has(path) &&
    !path.startsWith('src/html/guides/translations/')
  );
}

export function assertBaseline(name, violations) {
  const actual = {
    legacyCount: violations.length,
    legacyDigest: createHash('sha256')
      .update(violations.sort().join('\n'))
      .digest('hex'),
  };
  assert.deepEqual(
    actual,
    rules[name],
    'Object keys must be at most 16 characters, identifier-safe, and ' +
      'lower camel case. Update keys rather than the legacy baseline.',
  );
}

export async function scanJavascriptRoots(paths) {
  const files = (
    await Promise.all(
      paths.map((path) =>
        findFiles(join(root, path), new Set(['.js', '.mjs'])),
      ),
    )
  ).flat();
  return (
    await Promise.all(
      files.map(async (file) =>
        collectJavascriptViolations(await readFile(file, 'utf8')),
      ),
    )
  ).flat();
}

export { root };
