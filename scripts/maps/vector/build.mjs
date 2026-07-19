import { spawn, spawnSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

import { validateVectorLayers } from './prepare.mjs';
import { prepareVectorInputs } from './prepare.mjs';
import { tippecanoeArguments } from './command.mjs';

const values = process.argv.slice(2);

function option(name, fallback) {
  const exact = values.find((value) => value.startsWith(`--${name}=`));
  if (exact) return exact.slice(name.length + 3);
  const index = values.indexOf(`--${name}`);
  return index >= 0 ? values[index + 1] : fallback;
}

const cache = path.resolve(option('cache', '.cache/maps/natural-earth'));
const input = path.resolve(option('input', '.cache/maps/vector-input'));
const output = path.resolve(option('output', 'build/maps/local.pmtiles'));
const minimumZoom = Number.parseInt(option('minimum-zoom', '1'), 10);
const maximumZoom = Number.parseInt(option('maximum-zoom', '11'), 10);
const maximumTileBytes =
  Number.parseInt(option('max-tile-kib', '16'), 10) * 1024;
const detail = Number.parseInt(option('detail', '11'), 10);
const executable = process.env.TIPPECANOE || 'tippecanoe';

if (values.includes('--help')) {
  console.log(`Usage: npm run maps:build -- [options]

Builds one MVT-in-PMTiles archive with Tippecanoe.

Options:
  --cache path          Downloaded GeoJSON source directory
  --input path          Temporary normalized GeoJSON sequence directory
  --output file         PMTiles destination
  --minimum-zoom 1      First generated zoom level
  --maximum-zoom 11     Last generated zoom level
  --max-tile-kib 16     Maximum compressed MVT tile size
  --detail 11           Maximum geometry precision (2^detail extent)`);
  process.exit(0);
}

const available = spawnSync(executable, ['--version'], {
  encoding: 'utf8',
});
if (available.error?.code === 'ENOENT') {
  throw new Error(
    'Tippecanoe is required to build PMTiles. On macOS, run ' +
      '`brew install tippecanoe`, then retry.',
  );
}
if (available.status !== 0) {
  throw new Error(available.stderr || 'Unable to run Tippecanoe.');
}

validateVectorLayers();
await mkdir(path.dirname(output), { recursive: true });
console.log('Preparing compact vector layers...');
const inputs = await prepareVectorInputs({ cache, output: input });
for (const item of inputs) {
  console.log(`  ${item.layer}: ${item.features.toLocaleString()} features`);
}

const args = tippecanoeArguments({
  inputs,
  output,
  minimumZoom,
  maximumZoom,
  maximumTileBytes,
  detail,
});
console.log(
  `Building ${path.relative(process.cwd(), output)} with a ` +
    `${maximumTileBytes / 1024} KiB compressed tile limit...`,
);

await new Promise((resolve, reject) => {
  const child = spawn(executable, args, { stdio: 'inherit' });
  child.on('error', reject);
  child.on('exit', (code, signal) => {
    if (code === 0) resolve();
    else {
      reject(
        new Error(
          signal
            ? `Tippecanoe stopped by ${signal}.`
            : `Tippecanoe exited with status ${code}.`,
        ),
      );
    }
  });
});
