import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  findHtmlLineViolations,
  MAX_HTML_LINES,
} from '../../scripts/lint/lint-html-limits.mjs';

test('prevents new HTML files from exceeding 300 lines', async () => {
  assert.deepEqual(await findHtmlLineViolations(), []);
});

test('reports oversized HTML and growth beyond a legacy baseline', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'qr-html-lines-'));
  const sourceRoot = 'src/html';
  try {
    const directory = path.join(root, sourceRoot);
    await mkdir(directory, { recursive: true });
    const long = `${'<p>line</p>\n'.repeat(MAX_HTML_LINES + 1)}`;
    await writeFile(path.join(directory, 'new.html'), long);
    await writeFile(path.join(directory, 'legacy.html'), long);
    const legacyLimits = new Map([['src/html/legacy.html', 300]]);
    assert.deepEqual(
      await findHtmlLineViolations({ root, sourceRoot, legacyLimits }),
      [
        { file: 'src/html/legacy.html', lines: 301, limit: 300 },
        { file: 'src/html/new.html', lines: 301, limit: 300 },
      ],
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
