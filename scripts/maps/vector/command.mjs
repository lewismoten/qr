import path from 'node:path';

const ATTRIBUTION =
  'Natural Earth; GeoNames CC BY 4.0; U.S. Census Bureau; ' +
  'U.S. Geological Survey NHDPlus HR';

export function tippecanoeArguments({
  inputs,
  output,
  minimumZoom = 1,
  maximumZoom = 19,
  baseZoom = 16,
  maximumTileBytes = 64 * 1024,
  detail = 11,
  clipBoundingBox,
}) {
  const args = [
    '--force',
    '--read-parallel',
    '--projection=EPSG:4326',
    `--minimum-zoom=${minimumZoom}`,
    `--maximum-zoom=${maximumZoom}`,
    `--base-zoom=${Math.min(baseZoom, maximumZoom)}`,
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
  if (maximumTileBytes != null) {
    args.splice(6, 0, `--maximum-tile-bytes=${maximumTileBytes}`);
  }
  if (clipBoundingBox) {
    args.push(`--clip-bounding-box=${clipBoundingBox.join(',')}`);
  }
  for (const { layer, file } of inputs) {
    args.push(`--named-layer=${layer}:${path.resolve(file)}`);
  }
  return args;
}
