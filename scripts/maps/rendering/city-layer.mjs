function minimumZoom(feature) {
  const properties = feature.properties ?? {};
  return Number(properties.min_zoom ?? properties.MIN_ZOOM ?? 0);
}

export function renderCities(features, tile, project, tileSize) {
  return features
    .filter((feature) => minimumZoom(feature) <= tile.zoom)
    .map((feature) => {
      const radius = Math.max(0.8, 2.2 - minimumZoom(feature) * 0.16);
      const [x, y] = project(feature.geometry.coordinates, tile.zoom);
      const localX = x - tile.x * tileSize;
      const localY = y - tile.y * tileSize;
      if (localX < 0 || localX > 256 || localY < 0 || localY > 256) return '';
      return (
        `<circle class="city" cx="${localX.toFixed(1)}" ` +
        `cy="${localY.toFixed(1)}" r="${radius.toFixed(1)}"/>`
      );
    })
    .join('');
}

export function pointFeatures(collections, name, tile, project, tileSize) {
  const layer = collections[name];
  if (
    !layer ||
    tile.zoom < layer.minimumZoom ||
    tile.zoom > layer.maximumZoom
  ) {
    return [];
  }
  let index = layer.pointIndexes.get(tile.zoom);
  if (!index) {
    index = new Map();
    for (const feature of layer.features) {
      const [x, y] = project(feature.geometry.coordinates, tile.zoom);
      const key = `${Math.floor(x / tileSize)}:${Math.floor(y / tileSize)}`;
      const matches = index.get(key) ?? [];
      matches.push(feature);
      index.set(key, matches);
    }
    layer.pointIndexes.set(tile.zoom, index);
  }
  return index.get(`${tile.x}:${tile.y}`) ?? [];
}
