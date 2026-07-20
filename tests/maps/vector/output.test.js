import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  readPmtilesArchiveStats,
  removeStaleArchives,
  smallestArchivePath,
  temporaryArchivePath,
  validatePmtilesArchive,
  writeArchiveManifest,
} from '../../../scripts/maps/vector/output.mjs';
import { publishDetailedMap } from '../../../scripts/maps/vector/publish.mjs';

test('preserves PMTiles through temporary output validation', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'qr-map-output-'));
  const archive = path.join(root, 'local.partial.pmtiles');
  try {
    const bytes = Buffer.from('PMTiles\x03payload');
    await writeFile(archive, bytes);
    assert.equal(
      temporaryArchivePath(path.join(root, 'local.pmtiles')),
      archive,
    );
    assert.equal(
      smallestArchivePath(path.join(root, 'local.pmtiles')),
      path.join(root, 'local.smallest.pmtiles'),
    );
    assert.equal(await validatePmtilesArchive(archive, 1024), bytes.length);
    await assert.rejects(() => validatePmtilesArchive(archive, 4), /budget is/);
    await writeFile(archive, 'SQLite format 3');
    await assert.rejects(
      () => validatePmtilesArchive(archive, 1024),
      /PMTiles v3/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('reads tile counts and content bytes from a PMTiles header', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'qr-map-stats-'));
  const archive = path.join(root, 'local.pmtiles');
  try {
    const bytes = Buffer.alloc(96);
    bytes.write('PMTiles');
    bytes[7] = 3;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    view.setBigUint64(64, 1234n, true);
    view.setBigUint64(72, 80n, true);
    view.setBigUint64(80, 70n, true);
    view.setBigUint64(88, 60n, true);
    await writeFile(archive, bytes);
    assert.deepEqual(await readPmtilesArchiveStats(archive), {
      tileDataBytes: 1234,
      addressedTiles: 80,
      tileEntries: 70,
      tileContents: 60,
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('removes archives excluded from a replacement manifest', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'qr-map-stale-'));
  const manifest = path.join(root, 'local.json');
  const oldArchive = path.join(root, 'local-z09.pmtiles');
  const currentArchive = path.join(root, 'local-z09-north-west.pmtiles');
  try {
    await writeFile(oldArchive, 'old');
    await writeFile(currentArchive, 'current');
    await writeFile(
      manifest,
      JSON.stringify({ archives: [{ file: path.basename(oldArchive) }] }),
    );
    await removeStaleArchives(manifest, [currentArchive]);
    await assert.rejects(() => readFile(oldArchive), /ENOENT/);
    assert.equal(await readFile(currentArchive, 'utf8'), 'current');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('records a successful archive-set budget overage', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'qr-map-manifest-'));
  const manifestFile = path.join(root, 'local.json');
  try {
    await writeArchiveManifest({
      manifestFile,
      results: [],
      minimumZoom: 1,
      maximumZoom: 19,
      maximumArchiveMiB: 500,
      totalBytes: 510 * 1024 * 1024,
      overageBytes: 10 * 1024 * 1024,
    });
    const manifest = JSON.parse(await readFile(manifestFile, 'utf8'));
    assert.equal(manifest.overBudget, true);
    assert.equal(manifest.overageBytes, 10 * 1024 * 1024);
    assert.equal(manifest.totalBytes, 510 * 1024 * 1024);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('publishes the PMTiles archive into a new map directory', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'qr-map-publish-'));
  const archive = path.join(root, 'source', 'local.pmtiles');
  const outputRoot = path.join(root, 'site');
  try {
    await mkdir(path.dirname(archive), { recursive: true });
    await writeFile(archive, 'PMTiles');
    assert.equal(
      await publishDetailedMap({ outputRoot, archive, legacyTiles: '' }),
      'pmtiles',
    );
    assert.equal(
      await readFile(path.join(outputRoot, 'maps', 'local.pmtiles'), 'utf8'),
      'PMTiles',
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
