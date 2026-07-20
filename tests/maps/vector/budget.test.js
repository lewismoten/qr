import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  archiveReductionWarning,
  availableLevelBudget,
  compactBuildSettings,
  formatTileLimit,
  isUsefulArchiveReduction,
  planArchiveLevels,
  updateBudgetCarry,
} from '../../../scripts/maps/vector/budget.mjs';
import { publishDetailedMap } from '../../../scripts/maps/vector/publish.mjs';
import {
  adaptiveSplitFactor,
  planAdaptiveShardLevel,
} from '../../../scripts/maps/vector/shards.mjs';

test('allocates a growing budget to every active zoom level', () => {
  const mib = 1024 * 1024;
  const levels = planArchiveLevels({
    minimumZoom: 1,
    maximumZoom: 19,
    maximumArchiveBytes: 500 * mib,
    output: 'build/maps/local.pmtiles',
  });
  assert.equal(levels.length, 19);
  assert.equal(
    levels.reduce((sum, level) => sum + level.budgetBytes, 0),
    500 * mib,
  );
  assert.equal(
    levels.slice(0, 8).reduce((sum, level) => sum + level.budgetBytes, 0),
    5 * mib,
  );
  assert.equal(
    levels.slice(8, 12).reduce((sum, level) => sum + level.budgetBytes, 0),
    45 * mib,
  );
  assert.equal(
    levels.slice(12).reduce((sum, level) => sum + level.budgetBytes, 0),
    450 * mib,
  );
  assert.ok(levels.every((level) => level.minimumZoom === level.maximumZoom));
  assert.ok(
    levels.slice(1).every((level, index) => {
      return level.budgetBytes > levels[index].budgetBytes;
    }),
  );
  assert.match(levels[0].file, /local-z01\.pmtiles$/);
  assert.match(levels[18].file, /local-z19\.pmtiles$/);
});

test('reduces only an over-budget zoom level', () => {
  assert.deepEqual(
    compactBuildSettings({
      budgetBytes: 100,
      observedBytes: 200,
      maximumTileBytes: 16_384,
      detail: 11,
    }),
    { maximumTileBytes: 7536, detail: 11 },
  );
});

test('targets near-budget archives without a fixed twenty-percent cut', () => {
  assert.deepEqual(
    compactBuildSettings({
      budgetBytes: 95,
      observedBytes: 100,
      maximumTileBytes: 16_384,
      detail: 11,
      attempt: 2,
    }),
    { maximumTileBytes: 15_097, detail: 11 },
  );
});

test('reduces detail only after reaching the minimum tile ceiling', () => {
  assert.deepEqual(
    compactBuildSettings({
      budgetBytes: 50,
      observedBytes: 200,
      maximumTileBytes: 1024,
      detail: 11,
    }),
    { maximumTileBytes: 1024, detail: 10 },
  );
});

test('stops archive fitting when a retry saves less than five percent', () => {
  assert.equal(isUsefulArchiveReduction(2_607_094, 2_565_165), false);
  assert.equal(isUsefulArchiveReduction(2_607_094, 2_400_000), true);
  assert.equal(isUsefulArchiveReduction(0, 0), true);
  assert.match(
    archiveReductionWarning('z6', 2_607_094, 2_565_165),
    /improved only 1\.6%/,
  );
  assert.equal(archiveReductionWarning('z6', 100, 90), null);
  assert.equal(formatTileLimit(null), 'no tile ceiling (recovery)');
  assert.equal(formatTileLimit(16_384), '16.0 KiB tiles');
});

test('subdivides only dense regions to target archive sizes', () => {
  const mib = 1024 * 1024;
  const level = {
    minimumZoom: 14,
    maximumZoom: 14,
    budgetBytes: 220 * mib,
    file: 'build/maps/local-z14.pmtiles',
  };
  const parents = [5, 25, 45, 10].map((size, index) => ({
    bytes: size * mib,
    shardGrid: 2,
    shardColumn: index % 2,
    shardRow: Math.floor(index / 2),
  }));
  const shards = planAdaptiveShardLevel(level, parents, {
    minimumZoom: 9,
    targetBytes: 10 * mib,
  });

  assert.equal(shards.length, 22);
  assert.equal(
    shards.reduce((sum, shard) => sum + shard.budgetBytes, 0),
    level.budgetBytes,
  );
  assert.equal(shards.filter((shard) => shard.shardGrid === 2).length, 2);
  assert.equal(shards.filter((shard) => shard.shardGrid === 4).length, 4);
  assert.equal(shards.filter((shard) => shard.shardGrid === 8).length, 16);
  assert.match(
    shards.find((shard) => shard.shard === 'g4-x3-y0').file,
    /local-z14-g4-x3-y0\.pmtiles$/,
  );
  const dense = shards.find((shard) => shard.shard === 'g8-x0-y4');
  assert.equal(dense.bounds[0], -180);
  assert.equal(dense.bounds[2], -135);
  assert.equal(dense.bounds[3], 0);
});

test('chooses enough quadtree depth to approach the shard target', () => {
  const mib = 1024 * 1024;
  assert.equal(adaptiveSplitFactor(10 * mib, 10 * mib), 1);
  assert.equal(adaptiveSplitFactor(10 * mib + 1, 10 * mib), 2);
  assert.equal(adaptiveSplitFactor(40 * mib, 10 * mib), 2);
  assert.equal(adaptiveSplitFactor(40 * mib + 1, 10 * mib), 4);
  assert.throws(() => adaptiveSplitFactor(1, 0), /greater than zero/);
});

test('passes surplus without shrinking initial budgets for debt', () => {
  let carryBytes = updateBudgetCarry({
    carryBytes: 0,
    plannedBytes: 100,
    actualBytes: 60,
  });
  assert.equal(carryBytes, 40);
  assert.equal(
    availableLevelBudget({
      plannedBytes: 100,
      carryBytes,
      minimumLevelBytes: 10,
    }),
    140,
  );

  carryBytes = updateBudgetCarry({
    carryBytes: -30,
    plannedBytes: 20,
    actualBytes: 10,
  });
  assert.equal(carryBytes, -20);
  assert.equal(
    availableLevelBudget({
      plannedBytes: 10,
      carryBytes,
      minimumLevelBytes: 8,
    }),
    10,
  );
});

test('publishes every budgeted PMTiles archive and its manifest', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'qr-map-set-'));
  const source = path.join(root, 'source');
  const outputRoot = path.join(root, 'site');
  const manifest = path.join(source, 'local.json');
  try {
    await mkdir(source, { recursive: true });
    await mkdir(path.join(outputRoot, 'maps'), { recursive: true });
    await writeFile(path.join(outputRoot, 'maps/local.pmtiles'), 'stale');
    await writeFile(path.join(source, 'local-z01.pmtiles'), 'low');
    await writeFile(path.join(source, 'local-z09.pmtiles'), 'mid');
    await writeFile(
      manifest,
      JSON.stringify({
        archives: [
          { file: 'local-z01.pmtiles' },
          { file: 'local-z09.pmtiles' },
        ],
      }),
    );
    assert.equal(
      await publishDetailedMap({ outputRoot, manifest, legacyTiles: '' }),
      'pmtiles-set',
    );
    await assert.rejects(
      () => readFile(path.join(outputRoot, 'maps/local.pmtiles')),
      /ENOENT/,
    );
    assert.equal(
      await readFile(path.join(outputRoot, 'maps/local-z09.pmtiles'), 'utf8'),
      'mid',
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
