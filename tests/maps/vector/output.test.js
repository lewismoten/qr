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
    const rootDirectory = Buffer.from([1, 0, 1, 200, 1, 1]);
    const bytes = Buffer.alloc(127 + rootDirectory.length);
    bytes.write('PMTiles');
    bytes[7] = 3;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    view.setBigUint64(8, 127n, true);
    view.setBigUint64(16, BigInt(rootDirectory.length), true);
    view.setBigUint64(64, 1234n, true);
    view.setBigUint64(72, 80n, true);
    view.setBigUint64(80, 70n, true);
    view.setBigUint64(88, 60n, true);
    view.setUint8(97, 1);
    rootDirectory.copy(bytes, 127);
    await writeFile(archive, bytes);
    assert.deepEqual(await readPmtilesArchiveStats(archive, 100), {
      tileDataBytes: 1234,
      addressedTiles: 80,
      tileEntries: 70,
      tileContents: 60,
      averageStoredTileBytes: 21,
      actualLargestTileBytes: 200,
      actualTileContentsOverLimit: 1,
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('scans final tile sizes stored in PMTiles leaf directories', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'qr-map-leaf-stats-'));
  const archive = path.join(root, 'local.pmtiles');
  try {
    const rootDirectory = Buffer.from([1, 0, 0, 6, 1]);
    const leafDirectory = Buffer.from([1, 0, 1, 172, 2, 1]);
    const bytes = Buffer.alloc(
      127 + rootDirectory.length + leafDirectory.length,
    );
    bytes.write('PMTiles');
    bytes[7] = 3;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    view.setBigUint64(8, 127n, true);
    view.setBigUint64(16, BigInt(rootDirectory.length), true);
    view.setBigUint64(40, BigInt(127 + rootDirectory.length), true);
    view.setBigUint64(48, BigInt(leafDirectory.length), true);
    view.setBigUint64(64, 300n, true);
    view.setBigUint64(72, 1n, true);
    view.setBigUint64(80, 1n, true);
    view.setBigUint64(88, 1n, true);
    view.setUint8(97, 1);
    rootDirectory.copy(bytes, 127);
    leafDirectory.copy(bytes, 127 + rootDirectory.length);
    await writeFile(archive, bytes);

    const statistics = await readPmtilesArchiveStats(archive, 200);
    assert.equal(statistics.actualLargestTileBytes, 300);
    assert.equal(statistics.actualTileContentsOverLimit, 1);
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
  const missingManifest = path.join(root, 'missing.json');
  const missingLegacyTiles = path.join(root, 'missing-tiles');
  try {
    await mkdir(path.dirname(archive), { recursive: true });
    await writeFile(archive, 'PMTiles');
    assert.equal(
      await publishDetailedMap({
        outputRoot,
        archive,
        manifest: missingManifest,
        legacyTiles: missingLegacyTiles,
      }),
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
