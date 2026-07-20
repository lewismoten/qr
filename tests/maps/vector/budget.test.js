import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  compactBuildSettings,
  planArchiveLevels,
} from '../../../scripts/maps/vector/budget.mjs';
import { publishDetailedMap } from '../../../scripts/maps/vector/publish.mjs';

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

test('publishes every budgeted PMTiles archive and its manifest', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'qr-map-set-'));
  const source = path.join(root, 'source');
  const outputRoot = path.join(root, 'site');
  const manifest = path.join(source, 'local.json');
  try {
    await mkdir(source, { recursive: true });
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
    assert.equal(
      await readFile(path.join(outputRoot, 'maps/local-z09.pmtiles'), 'utf8'),
      'mid',
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
