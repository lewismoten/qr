export const MAP_TILE_STYLE =
  '<style>.country{fill:#d9e9c3;stroke:#5d8069;stroke-width:1}' +
  '.lake{fill:#bfe3ed;stroke:#75adbd;stroke-width:.5}' +
  '.river{fill:none;stroke:#75adbd;stroke-width:.45;' +
  'stroke-linecap:round;stroke-linejoin:round}' +
  '.river-detail{fill:none;stroke:#87bdca;stroke-width:.28;' +
  'stroke-linecap:round;stroke-linejoin:round}' +
  '.primary-road{fill:none;stroke:#c56f43;stroke-width:.8;' +
  'stroke-linecap:round;stroke-linejoin:round}' +
  '.secondary-road{fill:none;stroke:#d39772;stroke-width:.42;' +
  'stroke-linecap:round;stroke-linejoin:round}' +
  '.region{fill:none;stroke:#8a9d75;stroke-width:.7}' +
  '.subdivision{fill:none;stroke:#aab59a;stroke-width:.45}' +
  '.state-boundary{fill:none;stroke:#7d916f;stroke-width:.8}' +
  '.city{fill:#e11d48;stroke:#fff;stroke-width:.7}</style>';

export const SIMPLIFICATION_STEPS = [
  0.45, 0.75, 1, 1.5, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48,
];

export function activeFeatures(collections, name, zoom) {
  const layer = collections[name];
  if (!layer || zoom < layer.minimumZoom || zoom > layer.maximumZoom) return [];
  return layer.features;
}

export function rankedFeatures(collections, name, zoom) {
  return activeFeatures(collections, name, zoom).filter((feature) => {
    const minimumZoom = Number(feature.properties?.min_zoom ?? 0);
    return minimumZoom <= zoom;
  });
}

export function isUnitedStatesRegion(feature) {
  const properties = feature.properties ?? {};
  return (
    properties.ADM0_A3 === 'USA' ||
    properties.adm0_a3 === 'USA' ||
    properties.ADM0_NAME === 'United States of America'
  );
}

export function isNaturalEarthMinorRoad(feature, zoom) {
  if (zoom < 8) return false;
  const type = feature.properties?.type;
  return ['Road', 'Secondary Highway', 'Track', 'Ferry Route'].includes(type);
}
