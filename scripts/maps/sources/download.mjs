import path from 'node:path';

import { DEFAULT_LAYERS, MAP_SOURCES } from '../source-config.mjs';
import { obtainMapSource } from '../source-loader.mjs';
import { formatBytes } from '../tile-plan.mjs';

function option(name, fallback) {
  const exact = process.argv.find((value) => value.startsWith(`--${name}=`));
  if (exact) return exact.slice(name.length + 3);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const cache = path.resolve(option('cache', '.cache/maps/natural-earth'));
const layers = [
  ...new Set(option('layers', DEFAULT_LAYERS.join(',')).split(',')),
];

for (const name of layers) {
  const source = MAP_SOURCES[name];
  if (!source) throw new Error(`Unknown map layer: ${name}`);
  await obtainMapSource({ name, source, cache, formatBytes });
}

console.log(`${layers.length} map sources are available in ${cache}.`);
