import path from 'node:path';

const ATTRIBUTION =
  'Natural Earth; GeoNames CC BY 4.0; U.S. Census Bureau; ' +
  'U.S. Geological Survey NHDPlus HR';

export function tippecanoeArguments({
  inputs,
  output,
  minimumZoom = 1,
  maximumZoom = 15,
  baseZoom = 14,
  maximumTileBytes = 16 * 1024,
  detail = 11,
}) {
  const args = [
    '--force',
    '--read-parallel',
    '--projection=EPSG:4326',
    `--minimum-zoom=${minimumZoom}`,
    `--maximum-zoom=${maximumZoom}`,
    `--base-zoom=${Math.min(baseZoom, maximumZoom)}`,
    `--maximum-tile-bytes=${maximumTileBytes}`,
    `--full-detail=${detail}`,
    `--low-detail=${Math.max(8, detail - 2)}`,
    '--generate-variable-depth-tile-pyramid',
    '--drop-densest-as-needed',
    '--drop-smallest-as-needed',
    '--detect-shared-borders',
    '--name=QR Code Generator local map',
    '--description=Lossy local reference map',
    `--attribution=${ATTRIBUTION}`,
    `--output=${path.resolve(output)}`,
  ];
  for (const { layer, file } of inputs) {
    args.push(`--named-layer=${layer}:${path.resolve(file)}`);
  }
  return args;
}
