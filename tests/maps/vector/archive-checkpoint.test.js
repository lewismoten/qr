import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  createArchiveCheckpoint,
  createBuildFingerprint,
} from '../../../scripts/maps/vector/lifecycle/archive-checkpoint.mjs';

const options = {
  output: 'local.pmtiles',
  minimumZoom: 1,
  baseZoom: 16,
  maximumTileBytes: 65_536,
  maximumArchiveBytes: 500 * 1024 * 1024,
  detail: 11,
  budgetGrowth: 1.3,
  minimumLevelBytes: 128 * 1024,
  shardZoom: 9,
  shardTargetBytes: 10 * 1024 * 1024,
  shardVariancePercent: 20,
};

test('checkpoints and restores validated completed archives', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'qr-checkpoint-'));
  const output = path.join(root, 'local.pmtiles');
  const file = path.join(root, 'local-z09-north-west.pmtiles');
  const temporary = `${file}.partial`;
  const fingerprint = createBuildFingerprint({
    inputs: [{ layer: 'land', hash: 'abc' }],
    options: { ...options, output },
    tippecanoeVersion: 'tippecanoe v2.79.0',
  });
  const level = {
    minimumZoom: 9,
    maximumZoom: 9,
    shard: 'north-west',
    budgetBytes: 100,
    file,
  };
  try {
    await writeFile(temporary, 'valid archive');
    const checkpoint = await createArchiveCheckpoint({
      output,
      fingerprint,
      validate: async () => {},
    });
    const result = {
      ...level,
      allocatedBudgetBytes: 100,
      bytes: 13,
      naturalBytes: 13,
      retainedRatio: 1,
      temporary,
    };
    await checkpoint.complete(result);

    assert.equal(await readFile(file, 'utf8'), 'valid archive');
    const resumed = await checkpoint.restore(level, 120);
    assert.equal(resumed.resumed, true);
    assert.equal(resumed.allocatedBudgetBytes, 120);
    assert.equal(resumed.temporary, file);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('build fingerprints change with inputs and encoding settings', () => {
  const fingerprint = (hash, maximumTileBytes = 65_536) =>
    createBuildFingerprint({
      inputs: [{ layer: 'land', hash }],
      options: { ...options, maximumTileBytes },
      tippecanoeVersion: 'tippecanoe v2.79.0',
    });

  assert.notEqual(fingerprint('a'), fingerprint('b'));
  assert.notEqual(fingerprint('a'), fingerprint('a', 32_768));
});
