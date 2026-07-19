const LANGUAGE_NAMES = {
  ar: ['NAME_AR', 'name_ar'],
  en: ['NAME_EN', 'name_en'],
  es: ['NAME_ES', 'name_es'],
  hi: ['NAME_HI', 'name_hi'],
  zh: ['NAME_ZH', 'name_zh'],
};

export const VECTOR_LAYERS = {
  boundary: ['regions', 'states', 'subdivisions'],
  land: ['countries'],
  park: ['protectedAreas', 'protectedLines', 'protectedPoints'],
  place: ['cities', 'settlements', 'towns'],
  road: [
    'primaryRoadsOverview',
    'primaryRoads',
    'secondaryRoads',
    'naturalEarthRoads',
  ],
  water: ['lakesOverview', 'lakes'],
  waterway: [
    'riversOverview',
    'rivers',
    'riversNorthAmerica',
    'riversEurope',
    'riversAustralia',
  ],
};

const firstValue = (properties, keys) =>
  keys.map((key) => properties[key]).find((value) => value != null);

function sourceClass(name, properties) {
  if (name === 'subdivisions') return 'county';
  if (name === 'states') return 'state';
  if (name === 'regions') return 'region';
  if (name.includes('secondary')) return 'secondary';
  if (name.startsWith('primary')) return 'primary';
  if (name === 'protectedAreas') return 'area';
  if (name === 'protectedLines') return 'line';
  if (name === 'protectedPoints') return 'point';
  return firstValue(properties, [
    'type',
    'TYPE',
    'feature_code',
    'featurecla',
    'MTFCC',
  ]);
}

export function vectorProperties(name, properties = {}) {
  const values = {
    class: sourceClass(name, properties),
    name: firstValue(properties, ['name', 'NAME', 'ADMIN']),
    population: firstValue(properties, ['population', 'POP_MAX', 'POP_EST']),
    rank: firstValue(properties, [
      'scalerank',
      'SCALERANK',
      'labelrank',
      'LABELRANK',
    ]),
  };
  for (const [language, keys] of Object.entries(LANGUAGE_NAMES)) {
    values[`name_${language}`] = firstValue(properties, keys);
  }
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value != null && value !== ''),
  );
}

export function sourceLayer(name) {
  return Object.entries(VECTOR_LAYERS).find(([, names]) =>
    names.includes(name),
  )?.[0];
}
