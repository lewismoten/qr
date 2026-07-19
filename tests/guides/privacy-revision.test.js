import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { updatePrivacyRevision } from '../../scripts/guides/privacy-revision.mjs';

const FIRST_DATE = new Date('2026-07-17T12:00:00.000Z');
const SECOND_DATE = new Date('2026-07-18T13:30:00.000Z');

async function createFixture() {
  const directory = await mkdtemp(path.join(tmpdir(), 'privacy-revision-'));
  const manifestFile = path.join(directory, 'manifest.json');
  const privacyFile = path.join(directory, 'privacy.html');
  await writeFile(manifestFile, '{"locales":[]}\n');
  await writeFile(privacyFile, '<main>Original privacy text</main>');
  return { manifestFile, privacyFile };
}

test('privacy revision changes only with visible statement text', async () => {
  const files = await createFixture();
  const first = await updatePrivacyRevision({
    ...files,
    now: () => FIRST_DATE,
  });
  const unchanged = await updatePrivacyRevision({
    ...files,
    now: () => SECOND_DATE,
  });

  await writeFile(
    files.privacyFile,
    '<main>Original privacy text</main><script>changed()</script>',
  );
  const scriptOnly = await updatePrivacyRevision({
    ...files,
    now: () => SECOND_DATE,
  });

  await writeFile(files.privacyFile, '<main>Revised privacy text</main>');
  const revised = await updatePrivacyRevision({
    ...files,
    now: () => SECOND_DATE,
  });
  const manifest = JSON.parse(await readFile(files.manifestFile, 'utf8'));

  assert.equal(first.changed, true);
  assert.equal(first.lastUpdated, FIRST_DATE.toISOString());
  assert.equal(unchanged.changed, false);
  assert.equal(unchanged.lastUpdated, FIRST_DATE.toISOString());
  assert.equal(scriptOnly.changed, false);
  assert.equal(revised.changed, true);
  assert.equal(revised.lastUpdated, SECOND_DATE.toISOString());
  assert.deepEqual(manifest.documents.privacy, {
    contentHash: revised.contentHash,
    lastUpdated: SECOND_DATE.toISOString(),
  });
});
