import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { describe, test } from 'node:test';

import { parse } from 'espree';

const sourceRoot = new URL('../src/js/', import.meta.url);
const englishUrl = new URL('../locales/en-US.json', import.meta.url);

async function listJavaScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const url = new URL(entry.name, directory);
      if (entry.isDirectory()) {
        return listJavaScriptFiles(new URL(`${entry.name}/`, directory));
      }
      return entry.name.endsWith('.js') ? [url] : [];
    }),
  );
  return files.flat();
}

function flattenMessages(value, prefix = '', output = {}) {
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === 'object' && !Array.isArray(child)) {
      flattenMessages(child, path, output);
    } else {
      output[path] = child;
    }
  }
  return output;
}

function visit(node, callback) {
  if (!node || typeof node !== 'object') return;
  callback(node);
  for (const [key, child] of Object.entries(node)) {
    if (key === 'parent') continue;
    if (Array.isArray(child)) {
      child.forEach((value) => visit(value, callback));
    } else if (child?.type) {
      visit(child, callback);
    }
  }
}

function getLookupNames(program) {
  const names = new Set();
  for (const node of program.body) {
    if (node.type !== 'ImportDeclaration') continue;
    if (!node.source.value.includes('/i18n/')) continue;
    for (const specifier of node.specifiers) {
      if (
        specifier.type === 'ImportSpecifier' &&
        specifier.imported.name === 'lookup'
      ) {
        names.add(specifier.local.name);
      }
    }
  }
  return names;
}

function getTags(text) {
  return [
    ...new Set(
      [...text.matchAll(/\{([A-Za-z][\w.-]*)\}/g)].map((match) => match[1]),
    ),
  ].sort();
}

function getOptionKeys(node, location) {
  if (!node) return [];
  assert.equal(
    node.type,
    'ObjectExpression',
    `${location} must pass localization options as an object literal`,
  );
  return node.properties
    .map((property) => {
      assert.equal(
        property.type,
        'Property',
        `${location} cannot spread localization options`,
      );
      assert.equal(
        property.computed,
        false,
        `${location} cannot use computed localization option names`,
      );
      return String(property.key.name ?? property.key.value);
    })
    .sort();
}

function getStaticCalls(program, fileName) {
  const lookupNames = getLookupNames(program);
  const calls = [];
  visit(program, (node) => {
    if (node.type !== 'CallExpression') return;
    if (node.callee.type !== 'Identifier') return;
    if (!lookupNames.has(node.callee.name)) return;
    const [key, fallback, options] = node.arguments;
    if (key?.type !== 'Literal' || typeof key.value !== 'string') return;
    calls.push({
      key: key.value,
      fallback,
      options,
      location: `${fileName}:${node.loc.start.line}`,
    });
  });
  return calls;
}

describe('JavaScript localization calls', () => {
  test('literal lookups match en-US text and interpolation tags', async () => {
    const english = flattenMessages(
      JSON.parse(await readFile(englishUrl, 'utf8')),
    );
    const files = await listJavaScriptFiles(sourceRoot);
    let callCount = 0;
    const issues = [];

    for (const file of files) {
      const source = await readFile(file, 'utf8');
      const program = parse(source, {
        ecmaVersion: 'latest',
        sourceType: 'module',
        loc: true,
      });
      const fileName = file.pathname.split('/src/js/')[1];
      for (const call of getStaticCalls(program, fileName)) {
        callCount += 1;
        if (!Object.hasOwn(english, call.key)) {
          issues.push(`${call.location}: unknown key ${call.key}`);
          continue;
        }
        if (
          call.fallback?.type !== 'Literal' ||
          typeof call.fallback.value !== 'string'
        ) {
          issues.push(`${call.location}: ${call.key} needs a string fallback`);
          continue;
        }
        if (call.fallback.value !== english[call.key]) {
          issues.push(`${call.location}: fallback differs for ${call.key}`);
        }
        const tags = getTags(english[call.key]);
        if (getTags(call.fallback.value).join() !== tags.join()) {
          issues.push(`${call.location}: fallback tags differ for ${call.key}`);
        }
        const optionKeys = getOptionKeys(call.options, call.location);
        if (optionKeys.join() !== tags.join()) {
          issues.push(`${call.location}: option tags differ for ${call.key}`);
        }
      }
    }

    assert.ok(callCount > 100, 'Expected to inspect localization calls');
    assert.deepEqual(issues, [], 'Localization call contract violations');
  });
});
