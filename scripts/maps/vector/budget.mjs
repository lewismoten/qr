import path from 'node:path';

const DEFINITIONS = [
  { minimumZoom: 1, maximumZoom: 8, weight: 1 },
  { minimumZoom: 9, maximumZoom: 12, weight: 9 },
  { minimumZoom: 13, maximumZoom: Infinity, weight: 90 },
];

export function planArchiveBands({
  minimumZoom,
  maximumZoom,
  maximumArchiveBytes,
  output,
}) {
  const active = DEFINITIONS.filter(
    (band) =>
      band.maximumZoom >= minimumZoom && band.minimumZoom <= maximumZoom,
  );
  const totalWeight = active.reduce((sum, band) => sum + band.weight, 0);
  const parsed = path.parse(output);
  let allocated = 0;
  return active.map((band, index) => {
    const first = Math.max(minimumZoom, band.minimumZoom);
    const last = Math.min(maximumZoom, band.maximumZoom);
    const final = index === active.length - 1;
    const budgetBytes = final
      ? maximumArchiveBytes - allocated
      : Math.floor((maximumArchiveBytes * band.weight) / totalWeight);
    allocated += budgetBytes;
    const firstText = String(first).padStart(2, '0');
    const lastText = String(last).padStart(2, '0');
    const suffix = `z${firstText}-${lastText}`;
    return {
      minimumZoom: first,
      maximumZoom: last,
      budgetBytes,
      file: path.join(parsed.dir, `${parsed.name}-${suffix}${parsed.ext}`),
    };
  });
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

export function archiveManifestPath(output) {
  const parsed = path.parse(output);
  return path.join(parsed.dir, `${parsed.name}.json`);
}
