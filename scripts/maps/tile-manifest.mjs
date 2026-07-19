function sumLevels(levels, property) {
  return Object.values(levels).reduce(
    (total, level) => total + level[property],
    0,
  );
}

export function createTileManifest({
  current,
  previous,
  levels,
  availability,
  bundleLevels,
}) {
  const mergedLevels = { ...(previous?.levels ?? {}), ...levels };
  return {
    ...current,
    zoom: previous
      ? { minimum: previous.zoom.minimum, maximum: current.zoom.maximum }
      : current.zoom,
    candidates: (previous?.candidates ?? 0) + current.candidates,
    tiles: sumLevels(mergedLevels, 'tiles'),
    bytes: sumLevels(mergedLevels, 'bytes'),
    bytesBeforeSimplification:
      (previous?.bytesBeforeSimplification ?? 0) +
      current.bytesBeforeSimplification,
    simplified: sumLevels(mergedLevels, 'simplified'),
    levels: mergedLevels,
    tileAvailability: {
      ...(previous?.tileAvailability ?? {}),
      ...availability,
    },
    tileBundles: {
      template: '/maps/tiles/bundles/{z}/{x}/{y}.svg',
      levels: {
        ...(previous?.tileBundles?.levels ?? {}),
        ...bundleLevels,
      },
    },
  };
}
