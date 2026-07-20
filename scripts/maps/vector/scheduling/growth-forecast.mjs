const MINIMUM_GROWTH = 2;
const MAXIMUM_GROWTH = 3;
const DEFAULT_GROWTH = 2.5;

function clampGrowth(value) {
  return Math.min(MAXIMUM_GROWTH, Math.max(MINIMUM_GROWTH, value));
}

function totalBytes(results) {
  return results.reduce((sum, result) => sum + result.bytes, 0);
}

function featureCounts(inputs, zoom) {
  let visible = 0;
  let revealed = 0;
  for (const input of inputs) {
    for (const [minimumZoom, count] of Object.entries(
      input.featuresByMinimumZoom || {},
    )) {
      const level = Number(minimumZoom);
      if (level <= zoom) visible += count;
      if (level === zoom) revealed += count;
    }
  }
  return { visible, revealed };
}

export function forecastLevelGrowth({
  previousResults,
  earlierResults,
  inputs,
  zoom,
}) {
  const previousBytes = totalBytes(previousResults);
  const earlierBytes = totalBytes(earlierResults);
  const observed = earlierBytes ? previousBytes / earlierBytes : DEFAULT_GROWTH;
  const { visible, revealed } = featureCounts(inputs, zoom);
  const existing = Math.max(1, visible - revealed);
  const geometryIncrease = Math.min(1, revealed / existing);
  const multiplier = clampGrowth(observed + geometryIncrease);
  return {
    multiplier,
    geometryIncrease,
    observedGrowth: earlierBytes ? observed : null,
    visibleFeatures: visible,
    revealedFeatures: revealed,
  };
}

export function forecastRegionGrowth(
  parent,
  earlierResults,
  fallbackGrowth,
  geometryIncrease,
) {
  const parentGrid = parent.shardGrid ?? 1;
  const parentColumn = parent.shardColumn ?? 0;
  const parentRow = parent.shardRow ?? 0;
  const ancestors = earlierResults.filter((candidate) => {
    const grid = candidate.shardGrid ?? 1;
    if (grid > parentGrid || parentGrid % grid) return false;
    const scale = parentGrid / grid;
    return (
      Math.floor(parentColumn / scale) === (candidate.shardColumn ?? 0) &&
      Math.floor(parentRow / scale) === (candidate.shardRow ?? 0)
    );
  });
  const ancestor = ancestors.sort((left, right) => {
    return (right.shardGrid ?? 1) - (left.shardGrid ?? 1);
  })[0];
  if (!ancestor?.bytes) return fallbackGrowth;
  const scale = parentGrid / (ancestor.shardGrid ?? 1);
  const expectedBytes = ancestor.bytes / scale ** 2;
  return clampGrowth(parent.bytes / expectedBytes + geometryIncrease);
}
