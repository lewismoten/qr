import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  availableLevelBudget,
  compactBuildSettings,
  planArchiveLevels,
  updateBudgetCarry,
} from '../../../scripts/maps/vector/budget.mjs';
import { publishDetailedMap } from '../../../scripts/maps/vector/publish.mjs';
import { shardArchiveLevels } from '../../../scripts/maps/vector/shards.mjs';

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
    { maximumTileBytes: 7372, detail: 10 },
  );
});

test('splits detailed zooms into four budget-preserving quadrants', () => {
  const mib = 1024 * 1024;
  const planned = planArchiveLevels({
    minimumZoom: 1,
    maximumZoom: 19,
    maximumArchiveBytes: 500 * mib,
    output: 'build/maps/local.pmtiles',
  });
  const levels = shardArchiveLevels(planned, 9);
  assert.equal(levels.length, 52);
  assert.equal(
    levels.reduce((sum, level) => sum + level.budgetBytes, 0),
    500 * mib,
  );
  assert.equal(levels.filter((level) => level.minimumZoom === 8).length, 1);
  const zoomNine = levels.filter((level) => level.minimumZoom === 9);
  assert.equal(zoomNine.length, 4);
  assert.deepEqual(
    zoomNine.map((level) => level.shard),
    ['south-west', 'south-east', 'north-west', 'north-east'],
  );
  assert.deepEqual(zoomNine[0].bounds, [-180, -85.05112878, 0, 0]);
  assert.match(zoomNine[3].file, /local-z09-north-east\.pmtiles$/);
  assert.equal(
    zoomNine.reduce((sum, level) => sum + level.budgetBytes, 0),
    planned[8].budgetBytes,
  );
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
