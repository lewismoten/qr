import path from 'node:path';

const TIERS = [
  { minimumZoom: 1, maximumZoom: 9, weight: 10 },
  { minimumZoom: 10, maximumZoom: 12, weight: 9 },
  { minimumZoom: 13, maximumZoom: Infinity, weight: 81 },
];
const MINIMUM_USEFUL_REDUCTION = 0.05;
const KIBIBYTE = 1024;
const DEFAULT_MINIMUM_LEVEL_KIB = 128;
const MINIMUM_TILE_KIB = 4;
const MINIMUM_VECTOR_DETAIL = 8;
const FIRST_ATTEMPT_SAFETY_RATIO = 0.92;
const RETRY_SAFETY_RATIO = 0.97;
const MINIMUM_COMPACTION_RATIO = 0.2;
const MAXIMUM_COMPACTION_RATIO = 0.95;
const MINIMUM_TILE_REDUCTION_BYTES = 256;
const PERCENT_SCALE = 100;

function sourceMaximumZoom(inputs, fallback) {
  const values = inputs.flatMap((input) => {
    return Object.keys(input.featuresByZoomRange || {}).map((range) => {
      return Number(range.split('-')[1]);
    });
  });
  return values.length ? Math.max(...values) : fallback;
}

export function planArchiveLevels({
  minimumZoom,
  maximumZoom,
  maximumArchiveBytes,
  output,
  growth = 1.3,
  minimumLevelBytes = DEFAULT_MINIMUM_LEVEL_KIB * KIBIBYTE,
  inputs = [],
}) {
  const plannedMaximumZoom = Math.min(
    maximumZoom,
    sourceMaximumZoom(inputs, maximumZoom),
  );
  if (plannedMaximumZoom < minimumZoom || growth <= 1) {
    throw new RangeError('Invalid zoom budget.');
  }
  const active = TIERS.filter((tier) => {
    return (
      tier.maximumZoom >= minimumZoom && tier.minimumZoom <= plannedMaximumZoom
    );
  });
  const tierWeight = active.reduce((sum, tier) => sum + tier.weight, 0);
  const parsed = path.parse(output);
  const levels = [];
  let totalAllocated = 0;
  active.forEach((tier, tierIndex) => {
    const first = Math.max(minimumZoom, tier.minimumZoom);
    const last = Math.min(plannedMaximumZoom, tier.maximumZoom);
    const count = last - first + 1;
    const weights = Array.from(
      { length: count },
      (_, index) => growth ** index,
    );
    const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);
    const finalTier = tierIndex === active.length - 1;
    const tierBytes = finalTier
      ? maximumArchiveBytes - totalAllocated
      : Math.floor((maximumArchiveBytes * tier.weight) / tierWeight);
    let tierAllocated = 0;
    weights.forEach((weight, index) => {
      const zoom = first + index;
      const finalLevel = index === weights.length - 1;
      const budgetBytes = finalLevel
        ? tierBytes - tierAllocated
        : Math.floor((tierBytes * weight) / weightTotal);
      if (budgetBytes < minimumLevelBytes) {
        throw new RangeError('The archive budget is too small for every zoom.');
      }
      tierAllocated += budgetBytes;
      const suffix = `z${String(zoom).padStart(2, '0')}`;
      levels.push({
        minimumZoom: zoom,
        maximumZoom: zoom,
        budgetBytes,
        file: path.join(parsed.dir, `${parsed.name}-${suffix}${parsed.ext}`),
      });
    });
    totalAllocated += tierBytes;
  });
  return levels;
}

export function compactBuildSettings({
  budgetBytes,
  observedBytes,
  maximumTileBytes,
  detail,
  attempt = 1,
}) {
  const minimumTileBytes = MINIMUM_TILE_KIB * KIBIBYTE;
  if (maximumTileBytes <= minimumTileBytes) {
    return {
      maximumTileBytes: minimumTileBytes,
      detail: Math.max(MINIMUM_VECTOR_DETAIL, detail - 1),
    };
  }
  const safety =
    attempt === 1 ? FIRST_ATTEMPT_SAFETY_RATIO : RETRY_SAFETY_RATIO;
  const measuredRatio = (budgetBytes / observedBytes) * safety;
  const ratio = Math.max(
    MINIMUM_COMPACTION_RATIO,
    Math.min(MAXIMUM_COMPACTION_RATIO, measuredRatio),
  );
  const proportionalTarget = Math.floor(maximumTileBytes * ratio);
  const minimumReduction = maximumTileBytes - MINIMUM_TILE_REDUCTION_BYTES;
  return {
    maximumTileBytes: Math.max(
      minimumTileBytes,
      Math.min(proportionalTarget, minimumReduction),
    ),
    detail,
  };
}

export function isUsefulArchiveReduction(
  previousBytes,
  currentBytes,
  minimumReduction = MINIMUM_USEFUL_REDUCTION,
) {
  if (!Number.isFinite(previousBytes) || previousBytes <= 0) return true;
  return (previousBytes - currentBytes) / previousBytes >= minimumReduction;
}

export function archiveReductionWarning(label, previousBytes, currentBytes) {
  if (!previousBytes || isUsefulArchiveReduction(previousBytes, currentBytes)) {
    return null;
  }
  const reduction =
    ((previousBytes - currentBytes) / previousBytes) * PERCENT_SCALE;
  return (
    `${label} compaction improved only ${reduction.toFixed(1)}%; ` +
    'accepting its smallest archive.'
  );
}

export function formatTileLimit(maximumTileBytes) {
  return maximumTileBytes == null
    ? 'no tile ceiling (recovery)'
    : `${(maximumTileBytes / KIBIBYTE).toFixed(1)} KiB tiles`;
}

export function availableLevelBudget({
  plannedBytes,
  carryBytes,
  minimumLevelBytes,
}) {
  const availableSurplus = Math.max(0, carryBytes);
  return Math.max(minimumLevelBytes, plannedBytes + availableSurplus);
}

export function updateBudgetCarry({ carryBytes, plannedBytes, actualBytes }) {
  return carryBytes + plannedBytes - actualBytes;
}

export function archiveManifestPath(output) {
  const parsed = path.parse(output);
  return path.join(parsed.dir, `${parsed.name}.json`);
}
