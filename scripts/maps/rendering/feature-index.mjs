const clamp = (value, minimum, maximum) =>
  Math.min(maximum, Math.max(minimum, value));

export function createFeatureSelector(project, tileSize) {
  function tileRange(bounds, zoom) {
    const count = 2 ** zoom;
    const clampTile = (value) => clamp(Math.floor(value), 0, count - 1);
    return {
      firstX: clampTile((bounds[0] / 360 + 0.5) * count),
      lastX: clampTile((bounds[2] / 360 + 0.5) * count),
      firstY: clampTile(project([0, bounds[3]], zoom)[1] / tileSize),
      lastY: clampTile(project([0, bounds[1]], zoom)[1] / tileSize),
    };
  }

  function featuresInTile(collections, name, tile) {
    const layer = collections[name];
    if (
      !layer ||
      tile.zoom < layer.minimumZoom ||
      tile.zoom > layer.maximumZoom
    ) {
      return [];
    }
    let index = layer.tileIndexes.get(tile.zoom);
    if (!index) {
      index = new Map();
      for (const feature of layer.features) {
        const range = tileRange(feature._bounds, tile.zoom);
        for (let y = range.firstY; y <= range.lastY; y += 1) {
          for (let x = range.firstX; x <= range.lastX; x += 1) {
            const key = `${x}:${y}`;
            const matches = index.get(key) ?? [];
            matches.push(feature);
            index.set(key, matches);
          }
        }
      }
      layer.tileIndexes.set(tile.zoom, index);
    }
    return index.get(`${tile.x}:${tile.y}`) ?? [];
  }

  function rankedTileFeatures(collections, name, tile) {
    return featuresInTile(collections, name, tile).filter((feature) => {
      const minimumZoom = Number(feature.properties?.min_zoom ?? 0);
      return minimumZoom <= tile.zoom;
    });
  }

  return { featuresInTile, rankedTileFeatures };
}
