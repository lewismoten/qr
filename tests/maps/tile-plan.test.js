import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  createChildTilePlan,
  createTilePlan,
  formatBytes,
  parseBounds,
  parseZoomRange,
} from '../../scripts/maps/tile-plan.mjs';
import {
  estimateTileOutput,
  formatDuration,
  progressText,
} from '../../scripts/maps/planning/output-estimate.mjs';

describe('SVG map tile planning', () => {
  test('plans complete world zoom ranges', () => {
    const plan = createTilePlan({
      zoom: parseZoomRange('1-2'),
      bounds: parseBounds('world'),
    });

    assert.deepEqual(plan.levels, [
      { zoom: 1, tiles: 4 },
      { zoom: 2, tiles: 16 },
    ]);
    assert.equal(plan.tiles.length, 20);
    assert.deepEqual(parseZoomRange('5'), { minimum: 5, maximum: 5 });
    assert.equal(formatBytes(1536), '1.5 KiB');
  });

  test('extends only children of available parent tiles', () => {
    const plan = createChildTilePlan({ 8: { 3: [4, 5] } }, 8);

    assert.equal(plan.tiles.length, 8);
    assert.deepEqual(plan.levels, [{ zoom: 9, tiles: 8 }]);
    assert.deepEqual(plan.tiles[0], { zoom: 9, x: 6, y: 8 });
    assert.deepEqual(plan.tiles.at(-1), { zoom: 9, x: 7, y: 11 });
    assert.deepEqual(createChildTilePlan(null, 8).tiles, []);
  });

  test('estimates bundled output from prior level measurements', () => {
    const plan = createChildTilePlan({ 8: { 3: [4, 5] } }, 8);
    const estimate = estimateTileOutput({
      plan,
      bundleLevels: { 9: 2 },
      manifest: {
        levels: { 8: { bytes: 4000, bundles: 2, tiles: 2 } },
      },
    });

    assert.equal(estimate.files, 2);
    assert.equal(estimate.minimum, 2200);
    assert.equal(estimate.maximum, 4600);
    assert.equal(estimate.basis, 'parent-level output density');
    assert.equal(formatDuration(0), '<1s');
    assert.equal(formatDuration(75), '1m 15s');
    assert.match(progressText(5, 10, 2), /50% 5\/10 \| ETA 2s/);
    assert.equal(progressText(5, 10, 2).endsWith('\x1b[K'), true);
  });

  test('rejects invalid zooms and geographic bounds', () => {
    assert.throws(() => parseZoomRange('6-2'), /Zoom must be/);
    assert.throws(() => parseZoomRange('twenty'), /Invalid zoom/);
    assert.throws(() => parseBounds('1,2,3'), /Bounds must be/);
    assert.throws(() => parseBounds('-181,0,1,2'), /outside valid/);
    assert.throws(() => parseBounds('5,0,1,2'), /must increase/);
  });
});
