import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  findMarkdownViolations,
  MAX_MARKDOWN_LINES,
} from '../../scripts/lint/lint-markdown.mjs';

test('keeps Markdown documentation short and under docs', async () => {
  assert.deepEqual(await findMarkdownViolations(), []);
});

test('reports misplaced and oversized Markdown files', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'qr-markdown-layout-'));
  try {
    await mkdir(path.join(root, 'docs'));
    await writeFile(path.join(root, 'README.md'), '# Project\n');
    await writeFile(path.join(root, 'notes.md'), '# Notes\n');
    await writeFile(
      path.join(root, 'docs', 'large.md'),
      `${Array.from({ length: MAX_MARKDOWN_LINES + 1 }, () => 'line').join('\n')}\n`,
    );
    assert.deepEqual(await findMarkdownViolations(root), [
      { file: 'docs/large.md', reason: 'too long', lines: 301 },
      { file: 'notes.md', reason: 'outside docs', lines: 1 },
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
