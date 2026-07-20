import assert from 'node:assert/strict';
import {
  mkdtemp,
  mkdir,
  readdir,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { readHtmlWithIncludes } from '../../scripts/html/includes.mjs';

async function findHtml(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) return findHtml(target);
      return entry.name.endsWith('.html') ? [target] : [];
    }),
  );
  return files.flat();
}

test('every source HTML file is a complete standalone document', async () => {
  const root = path.resolve('src/html');
  for (const file of await findHtml(root)) {
    const source = await readFile(file, 'utf8');
    assert.match(source, /^\s*<!doctype html>/i, file);
    assert.match(source, /<html(?:\s[^>]*)?>/i, file);
    assert.match(
      source,
      /<head(?:\s[^>]*)?>[\s\S]*<title(?:\s[^>]*)?>[\s\S]+?<\/title>/i,
      file,
    );
    assert.match(source, /<body(?:\s[^>]*)?>[\s\S]*<\/body\s*>/i, file);
    assert.match(source, /<\/html\s*>\s*$/i, file);
  }
});

test('composes nested HTML includes relative to their source files', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'qr-html-includes-'));
  try {
    await mkdir(path.join(root, 'parts'));
    await writeFile(
      path.join(root, 'index.html'),
      '<!doctype html><html><head><title>Index</title></head><body>' +
        '<main><!-- include file="parts/one.html" --></main>' +
        '</body></html>',
    );
    await writeFile(
      path.join(root, 'parts/one.html'),
      '<!doctype html><html><head><title>One</title></head><body>' +
        '<section><!-- include file="two.html" --></section>' +
        '</body></html>',
    );
    await writeFile(
      path.join(root, 'parts/two.html'),
      '<!doctype html><html><head><title>Two</title></head>' +
        '<body><p>Two</p></body></html>',
    );
    assert.equal(
      await readHtmlWithIncludes(path.join(root, 'index.html'), { root }),
      '<!doctype html><html><head><title>Index</title></head><body>' +
        '<main><section><p>Two</p></section></main></body></html>',
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('rejects included documents without a body', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'qr-html-body-'));
  try {
    await writeFile(
      path.join(root, 'index.html'),
      '<!-- include file="part.html" -->',
    );
    await writeFile(path.join(root, 'part.html'), '<p>Not a document</p>');
    await assert.rejects(
      () => readHtmlWithIncludes(path.join(root, 'index.html'), { root }),
      /Included HTML has no body/,
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
