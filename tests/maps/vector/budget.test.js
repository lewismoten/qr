import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  compactBuildSettings,
  planArchiveBands,
} from '../../../scripts/maps/vector/budget.mjs';
import { publishDetailedMap } from '../../../scripts/maps/vector/publish.mjs';

test('allocates archive budgets by active zoom band', () => {
  const mib = 1024 * 1024;
  const bands = planArchiveBands({
    minimumZoom: 1,
    maximumZoom: 17,
    maximumArchiveBytes: 500 * mib,
    output: 'build/maps/local.pmtiles',
  });
  assert.deepEqual(
    bands.map((band) => [
      band.minimumZoom,
      band.maximumZoom,
      band.budgetBytes / mib,
    ]),
    [
      [1, 8, 5],
      [9, 12, 45],
      [13, 17, 450],
    ],
  );
});

test('reduces only an over-budget zoom band', () => {
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
    await writeFile(path.join(source, 'local-z01-08.pmtiles'), 'low');
    await writeFile(path.join(source, 'local-z09-12.pmtiles'), 'mid');
    await writeFile(
      manifest,
      JSON.stringify({
        archives: [
          { file: 'local-z01-08.pmtiles' },
          { file: 'local-z09-12.pmtiles' },
        ],
      }),
    );
    assert.equal(
      await publishDetailedMap({ outputRoot, manifest, legacyTiles: '' }),
      'pmtiles-set',
    );
    assert.equal(
      await readFile(
        path.join(outputRoot, 'maps/local-z09-12.pmtiles'),
        'utf8',
      ),
      'mid',
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
