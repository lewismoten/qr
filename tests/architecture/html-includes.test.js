import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { readHtmlWithIncludes } from '../../scripts/html/includes.mjs';

test('composes nested HTML includes relative to their source files', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'qr-html-includes-'));
  try {
    await mkdir(path.join(root, 'parts'));
    await writeFile(
      path.join(root, 'index.html'),
      '<main><!-- include file="parts/one.html" --></main>',
    );
    await writeFile(
      path.join(root, 'parts/one.html'),
      '<section><!-- include file="two.html" --></section>',
    );
    await writeFile(path.join(root, 'parts/two.html'), '<p>Two</p>');
    assert.equal(
      await readHtmlWithIncludes(path.join(root, 'index.html'), { root }),
      '<main><section><p>Two</p></section></main>',
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('rejects circular includes and paths outside the HTML root', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'qr-html-safety-'));
  try {
    await writeFile(
      path.join(root, 'cycle.html'),
      '<!-- include file="cycle.html" -->',
    );
    await assert.rejects(
      () => readHtmlWithIncludes(path.join(root, 'cycle.html'), { root }),
      /Circular HTML include/,
    );
    await writeFile(
      path.join(root, 'escape.html'),
      '<!-- include file="../outside.html" -->',
    );
    await assert.rejects(
      () => readHtmlWithIncludes(path.join(root, 'escape.html'), { root }),
      /escapes its source root/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
