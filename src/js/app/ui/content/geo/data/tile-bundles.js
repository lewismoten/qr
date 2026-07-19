function tileUrl(template, tile) {
  return template
    .replace('{z}', tile.zoom)
    .replace('{x}', tile.x)
    .replace('{y}', tile.y);
}

export function createTileBundleResolver(manifest) {
  const template = manifest.tileBundles?.template;
  const configured = manifest.tileBundles?.levels;
  if (typeof template !== 'string' || !configured) return null;
  const levels = new Map(
    Object.entries(configured)
      .map(([zoom, size]) => [Number(zoom), Number(size)])
      .filter(
        ([zoom, size]) =>
          Number.isInteger(zoom) && Number.isInteger(size) && size > 1,
      ),
  );
  if (!levels.size) return null;
  return (tile) => {
    const size = levels.get(tile.zoom);
    if (!size) return null;
    const bundle = {
      zoom: tile.zoom,
      x: Math.floor(tile.x / size),
      y: Math.floor(tile.y / size),
    };
    return {
      url: tileUrl(template, bundle),
      size,
      offsetX: tile.x % size,
      offsetY: tile.y % size,
    };
  };
}
