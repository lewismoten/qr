import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const repositoryRoot = path.resolve(import.meta.dirname, '../..');
const ignoredDirectories = new Set([
  '.cache',
  '.git',
  'build',
  'coverage',
  'dist',
  'node_modules',
]);
const textExtensions = new Set([
  '.css',
  '.html',
  '.js',
  '.json',
  '.md',
  '.mjs',
  '.txt',
  '.xml',
  '.yaml',
  '.yml',
]);
const textNames = new Set(['.gitignore', '.npmrc', 'LICENSE']);
const formatControlPattern = /\p{Cf}/gu;

const NULL_CHARACTER = '\\u{0000}';
const BACKSPACE_CONTROL = '\\u{0008}';
const VERTICAL_TAB = '\\u{000B}';
const FORM_FEED = '\\u{000C}';
const SHIFT_OUT_CONTROL = '\\u{000E}';
const UNIT_SEPARATOR_CONTROL = '\\u{001F}';
const DELETE_CONTROL = '\\u{007F}';
const APPLICATION_PROGRAM_COMMAND_CONTROL = '\\u{009F}';
const NO_BREAK_SPACE = '\\u{00A0}';
const OGHAM_SPACE_MARK = '\\u{1680}';
const EN_QUAD = '\\u{2000}';
const HAIR_SPACE = '\\u{200A}';
const LINE_SEPARATOR = '\\u{2028}';
const PARAGRAPH_SEPARATOR = '\\u{2029}';
const NARROW_NO_BREAK_SPACE = '\\u{202F}';
const MEDIUM_MATHEMATICAL_SPACE = '\\u{205F}';
const IDEOGRAPHIC_SPACE = '\\u{3000}';

function unicodeRange(first, last) {
  return `${first}-${last}`;
}

const unusualWhitespacePattern = new RegExp(
  `[${[
    unicodeRange(NULL_CHARACTER, BACKSPACE_CONTROL),
    VERTICAL_TAB,
    FORM_FEED,
    unicodeRange(SHIFT_OUT_CONTROL, UNIT_SEPARATOR_CONTROL),
    unicodeRange(DELETE_CONTROL, APPLICATION_PROGRAM_COMMAND_CONTROL),
    NO_BREAK_SPACE,
    OGHAM_SPACE_MARK,
    unicodeRange(EN_QUAD, HAIR_SPACE),
    LINE_SEPARATOR,
    PARAGRAPH_SEPARATOR,
    NARROW_NO_BREAK_SPACE,
    MEDIUM_MATHEMATICAL_SPACE,
    IDEOGRAPHIC_SPACE,
  ].join('')}]`,
  'gu',
);

function isTextFile(file) {
  return (
    textExtensions.has(path.extname(file)) || textNames.has(path.basename(file))
  );
}

async function collectTextFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      if (entry.isDirectory() && ignoredDirectories.has(entry.name)) return [];
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) return collectTextFiles(file);
      return entry.isFile() && isTextFile(file) ? [file] : [];
    }),
  );
  return files.flat();
}

function describeMatches(file, source, pattern) {
  return [...source.matchAll(pattern)].map((match) => {
    const codePoint = match[0].codePointAt(0);
    const value = codePoint.toString(16).toUpperCase().padStart(4, '0');
    const line = source.slice(0, match.index).split('\n').length;
    return `${path.relative(repositoryRoot, file)}:${line} U+${value}`;
  });
}

test('text source spells invisible Unicode controls as escapes', async () => {
  const files = await collectTextFiles(repositoryRoot);
  const findings = await Promise.all(
    files.map(async (file) => {
      const source = await readFile(file, 'utf8');
      return [
        ...describeMatches(file, source, formatControlPattern),
        ...describeMatches(file, source, unusualWhitespacePattern),
      ];
    }),
  );
  const issues = findings.flat();

  assert.deepEqual(
    issues,
    [],
    'Use visible escapes such as \\u200F or \\u{200F}:\n' + issues.join('\n'),
  );
});
