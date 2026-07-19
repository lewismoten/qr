import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import {
  assembleLocaleResource,
  buildLocaleResources,
  readLocaleManifest,
} from '../../../scripts/locales/resources.mjs';

const sourceRoot = 'locales';
const maximumLines = 300;

async function findJson(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const file = path.join(directory, entry.name);
      return entry.isDirectory()
        ? findJson(file)
        : entry.name.endsWith('.json')
          ? [file]
          : [];
    }),
  );
  return files.flat();
}

test('locale source JSON stays split into manageable files', async () => {
  const manifest = await readLocaleManifest(sourceRoot);
  const localeNames = new Set(
    manifest.locales.map((entry) => `${entry.code || entry}.json`),
  );
  for (const file of await findJson(sourceRoot)) {
    const source = await readFile(file, 'utf8');
    const lines = source
      ? source.replace(/\r?\n$/, '').split(/\r?\n/).length
      : 0;
    assert.ok(lines <= maximumLines, `${file} exceeds ${maximumLines} lines`);
    if (path.basename(file) !== 'manifest.json') {
      assert.ok(
        localeNames.has(path.basename(file)),
        `${file} is not a locale`,
      );
    }
  }
});

test('locale folders recursively become assembled object keys', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'qr-locales-'));
  await writeFile(path.join(root, 'en-US.json'), '{"root":"value"}');
  await writeFile(
    path.join(root, 'manifest.json'),
    '{"locales":[{"code":"en-US"}]}',
  );
  await mkdir(path.join(root, 'content', 'email'), { recursive: true });
  await writeFile(
    path.join(root, 'content', 'en-US.json'),
    '{"title":"Content"}',
  );
  await writeFile(
    path.join(root, 'content', 'email', 'en-US.json'),
    '{"subject":"Subject"}',
  );

  assert.deepEqual(await assembleLocaleResource('en-US', root), {
    root: 'value',
    content: {
      title: 'Content',
      email: { subject: 'Subject' },
    },
  });
});

test('deployment locale files equal their assembled sources', async () => {
  const outputRoot = await mkdtemp(path.join(tmpdir(), 'qr-built-locales-'));
  const locales = await buildLocaleResources({ outputRoot, sourceRoot });
  for (const locale of locales) {
    const deployed = JSON.parse(
      await readFile(path.join(outputRoot, `${locale}.json`), 'utf8'),
    );
    assert.deepEqual(
      deployed,
      await assembleLocaleResource(locale, sourceRoot),
    );
  }
});
