import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import {
  COLOR_BLACK,
  COLOR_DARK,
  COLOR_WHITE,
  colorWithTransparency,
  getColorAlpha,
  getContrastingHex,
  hexToRgb,
  hexToRgba,
} from '../../src/js/app/colors.js';

const KNOWN_COLORS = /['"]#(?:000000|ffffff|111827|0f766e|0ea5e9|60a5fa)['"]/gi;
const MEDIA_TYPE_LITERAL = /['"](?:application|image|text)\/[a-z0-9.+-]+['"]/gi;
const APPLICATION_TYPE_LITERAL = /['"]application\/[a-z0-9.+-]+/gi;
const TEXT_TYPE_LITERAL = /['"]text\/[a-z0-9.+-]*/gi;
const HINDI_LOCALE_PROPERTY = /['"]hi-IN['"]\s*:/g;

test('color helpers normalize channels, alpha, and contrast', () => {
  assert.equal(colorWithTransparency('#123456', { value: '25' }), '#123456bf');
  assert.equal(
    colorWithTransparency('invalid', { value: '-20' }),
    `${COLOR_BLACK}ff`,
  );
  assert.equal(colorWithTransparency('#ffffff', { value: '120' }), '#ffffff00');
  assert.equal(
    colorWithTransparency('#ffffff', { value: 'invalid' }),
    '#ffffffff',
  );
  assert.equal(getColorAlpha('transparent'), 0);
  assert.equal(getColorAlpha('#00000080'), 128 / 255);
  assert.equal(getColorAlpha('#000000'), 1);
  assert.deepEqual(hexToRgb('#abc'), { red: 170, green: 187, blue: 204 });
  assert.deepEqual(hexToRgb('123456'), { red: 18, green: 52, blue: 86 });
  assert.equal(hexToRgba('#123456', 0.5), 'rgba(18, 52, 86, 0.5)');
  assert.equal(getContrastingHex('#ffffff'), COLOR_DARK);
  assert.equal(getContrastingHex('#000000'), COLOR_WHITE);
});

async function findJavaScript(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) return findJavaScript(target);
      return /\.(?:js|mjs)$/.test(entry.name) ? [target] : [];
    }),
  );
  return files.flat();
}

async function findViolations(roots, allowedFile, pattern) {
  const files = (await Promise.all(roots.map(findJavaScript))).flat();
  const violations = [];
  for (const file of files) {
    if (file === allowedFile) continue;
    const source = await readFile(file, 'utf8');
    if (pattern.test(source)) violations.push(path.relative('.', file));
    pattern.lastIndex = 0;
  }
  return violations;
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

test('application MIME types are declared only in the registry', async () => {
  const registry = path.resolve('src/js/app/media-types.js');
  const violations = await findViolations(
    [path.resolve('src/js'), path.resolve('scripts')],
    registry,
    APPLICATION_TYPE_LITERAL,
  );
  assert.deepEqual(violations, []);
});

test('text MIME types are declared only in the registry', async () => {
  const registry = path.resolve('src/js/app/media-types.js');
  const violations = await findViolations(
    [path.resolve('src/js'), path.resolve('scripts')],
    registry,
    TEXT_TYPE_LITERAL,
  );
  assert.deepEqual(violations, []);
});

test('locale-keyed JavaScript is limited to route metadata', async () => {
  const routes = path.resolve('src/js/i18n/guide-routes.js');
  const violations = await findViolations(
    [path.resolve('src/js'), path.resolve('scripts')],
    routes,
    HINDI_LOCALE_PROPERTY,
  );
  assert.deepEqual(violations, []);
  const routeSource = await readFile(routes, 'utf8');
  assert.equal(
    [...routeSource.matchAll(HINDI_LOCALE_PROPERTY)].length,
    2,
    'Only native route and navigation alias metadata may be locale-keyed.',
  );
});
