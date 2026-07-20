import { levelShardLabel, planAdaptiveShardLevel } from '../shards.mjs';
import {
  forecastLevelGrowth,
  forecastRegionGrowth,
} from './growth-forecast.mjs';

const MEBIBYTE = 1024 * 1024;

function size(value) {
  return `${(value / MEBIBYTE).toFixed(1)} MiB`;
}

export function createLevelPlanner({
  inputs,
  shardZoom,
  shardTargetBytes,
  shardVariancePercent,
}) {
  return (level, previousResults, earlierResults) => {
    const forecast = forecastLevelGrowth({
      previousResults,
      earlierResults,
      inputs,
      zoom: level.minimumZoom,
    });
    const planned = planAdaptiveShardLevel(
      { ...level, ...forecast },
      previousResults,
      {
        minimumZoom: shardZoom,
        targetBytes: shardTargetBytes,
        targetVariance: shardVariancePercent / 100,
        forecastMultiplier(parent) {
          return forecastRegionGrowth(
            parent,
            earlierResults,
            forecast.multiplier,
            forecast.geometryIncrease,
          );
        },
      },
    );
    if (level.minimumZoom >= shardZoom) {
      const revealed = forecast.revealedFeatures.toLocaleString();
      const currentBytes = previousResults.reduce(
        (sum, result) => sum + result.bytes,
        0,
      );
      const projectedBytes = planned.reduce(
        (sum, item) => sum + item.forecastBytes,
        0,
      );
      const factors = planned.map((item) => item.forecastMultiplier);
      const minimum = Math.min(...factors).toFixed(2);
      const maximum = Math.max(...factors).toFixed(2);
      const growth =
        minimum === maximum ? `${minimum}x` : `${minimum}-${maximum}x`;
      console.log(
        `Forecast ${levelShardLabel(level)}: ` +
          `${size(currentBytes)} -> ${size(projectedBytes)}, ` +
          `${growth} regional growth, ` +
          `${revealed} newly visible features, ` +
          `${planned.length} archive${planned.length === 1 ? '' : 's'}.`,
      );
    }
    return planned;
  };
}
