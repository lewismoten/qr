const MINIMUM_GROWTH = 2;
const MAXIMUM_GROWTH = 3;
const DEFAULT_GROWTH = 2.5;
const MINIMUM_SHRINK_RATIO = 0.05;

function clampGrowth(value) {
  return Math.min(MAXIMUM_GROWTH, Math.max(MINIMUM_GROWTH, value));
}

function totalBytes(results) {
  return results.reduce((sum, result) => {
    return sum + (result.naturalBytes ?? result.bytes);
  }, 0);
}

function rangeCounts(input, zoom) {
  const ranges = Object.entries(input.featuresByZoomRange || {});
  if (!ranges.length) return null;
  let visible = 0;
  let revealed = 0;
  for (const [range, count] of ranges) {
    const [minimumZoom, maximumZoom] = range.split('-').map(Number);
    if (minimumZoom <= zoom && zoom <= maximumZoom) visible += count;
    if (minimumZoom === zoom) revealed += count;
  }
  return { visible, revealed };
}

function minimumZoomCounts(input, zoom) {
  let visible = 0;
  let revealed = 0;
  for (const [minimumZoom, count] of Object.entries(
    input.featuresByMinimumZoom || {},
  )) {
    const level = Number(minimumZoom);
    if (level <= zoom) visible += count;
    if (level === zoom) revealed += count;
  }
  return { visible, revealed };
}

export function featureCounts(inputs, zoom) {
  let visible = 0;
  let revealed = 0;
  const revealedByLayer = {};
  for (const input of inputs) {
    const counts = rangeCounts(input, zoom) || minimumZoomCounts(input, zoom);
    visible += counts.visible;
    revealed += counts.revealed;
    if (counts.revealed) revealedByLayer[input.layer] = counts.revealed;
  }
  return { visible, revealed, revealedByLayer };
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
  const { visible, revealed, revealedByLayer } = featureCounts(inputs, zoom);
  const previousVisible = featureCounts(inputs, zoom - 1).visible;
  const activeRatio = previousVisible ? visible / previousVisible : 1;
  const expired = Math.max(0, previousVisible + revealed - visible);
  const existing = Math.max(1, visible - revealed);
  const geometryIncrease = Math.min(1, revealed / existing);
  const multiplier =
    activeRatio < 1
      ? Math.min(
          MAXIMUM_GROWTH,
          Math.max(MINIMUM_SHRINK_RATIO, observed * activeRatio),
        )
      : clampGrowth(observed + geometryIncrease);
  return {
    multiplier,
    activeRatio,
    expiredFeatures: expired,
    geometryIncrease,
    observedGrowth: earlierBytes ? observed : null,
    visibleFeatures: visible,
    revealedFeatures: revealed,
    revealedFeaturesByLayer: revealedByLayer,
  };
}

export function forecastRegionGrowth(
  parent,
  earlierResults,
  fallbackGrowth,
  geometryIncrease,
) {
  if (fallbackGrowth < 1) return fallbackGrowth;
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
  const ancestorBytes = ancestor?.naturalBytes ?? ancestor?.bytes;
  if (!ancestorBytes) return fallbackGrowth;
  const scale = parentGrid / (ancestor.shardGrid ?? 1);
  const expectedBytes = ancestorBytes / scale ** 2;
  const parentBytes = parent.naturalBytes ?? parent.bytes;
  return clampGrowth(parentBytes / expectedBytes + geometryIncrease);
}
