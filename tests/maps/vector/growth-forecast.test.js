import assert from 'node:assert/strict';
import test from 'node:test';

import {
  forecastLevelGrowth,
  forecastRegionGrowth,
} from '../../../scripts/maps/vector/scheduling/growth-forecast.mjs';
import { planAdaptiveShardLevel } from '../../../scripts/maps/vector/shards.mjs';

test('forecasts archive growth from history and newly revealed geometry', () => {
  const forecast = forecastLevelGrowth({
    previousResults: [{ bytes: 24 }],
    earlierResults: [{ bytes: 10 }],
    inputs: [
      {
        layer: 'waterway',
        featuresByMinimumZoom: { 8: 100, 9: 50 },
      },
    ],
    zoom: 9,
  });

  assert.equal(forecast.multiplier, 2.9);
  assert.equal(forecast.observedGrowth, 2.4);
  assert.equal(forecast.visibleFeatures, 150);
  assert.equal(forecast.revealedFeatures, 50);
  assert.deepEqual(forecast.revealedFeaturesByLayer, { waterway: 50 });
});

test('forecasts growth independently for a divided region', () => {
  const parent = {
    bytes: 2,
    naturalBytes: 6,
    shardGrid: 2,
    shardColumn: 1,
    shardRow: 0,
  };
  const earlier = [{ bytes: 8 }];

  assert.equal(forecastRegionGrowth(parent, earlier, 2.5, 0), 3);
  assert.equal(forecastRegionGrowth(parent, [], 2.5, 0), 2.5);
});

test('proactively subdivides a region using forecast archive size', () => {
  const mib = 1024 * 1024;
  const level = {
    minimumZoom: 9,
    budgetBytes: 20 * mib,
    file: 'build/maps/local-z09.pmtiles',
  };
  const planned = planAdaptiveShardLevel(level, [{ bytes: 5 * mib }], {
    minimumZoom: 9,
    targetBytes: 10 * mib,
    forecastMultiplier: 2.5,
  });

  assert.equal(planned.length, 4);
  assert.ok(planned.every((item) => item.forecastBytes <= 10 * mib));
});
