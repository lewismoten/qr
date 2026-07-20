import path from 'node:path';

const TIERS = [
  { minimumZoom: 1, maximumZoom: 8, weight: 1 },
  { minimumZoom: 9, maximumZoom: 12, weight: 9 },
  { minimumZoom: 13, maximumZoom: Infinity, weight: 90 },
];

export function planArchiveLevels({
  minimumZoom,
  maximumZoom,
  maximumArchiveBytes,
  output,
  growth = 1.3,
  minimumLevelBytes = 128 * 1024,
}) {
  if (maximumZoom < minimumZoom || growth <= 1) {
    throw new RangeError('Invalid zoom budget.');
  }
  const active = TIERS.filter((tier) => {
    return tier.maximumZoom >= minimumZoom && tier.minimumZoom <= maximumZoom;
  });
  const tierWeight = active.reduce((sum, tier) => sum + tier.weight, 0);
  const parsed = path.parse(output);
  const levels = [];
  let totalAllocated = 0;
  active.forEach((tier, tierIndex) => {
    const first = Math.max(minimumZoom, tier.minimumZoom);
    const last = Math.min(maximumZoom, tier.maximumZoom);
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
}) {
  const ratio = Math.min(0.8, (budgetBytes / observedBytes) * 0.9);
  return {
    maximumTileBytes: Math.max(1024, Math.floor(maximumTileBytes * ratio)),
    detail: Math.max(8, detail - 1),
  };
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
