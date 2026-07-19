import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const TILE_SIZE = 256;
const STYLE_PATTERN = /<style>[\s\S]*?<\/style>/;

function tileBody(svg) {
  return svg
    .replace(/^<svg[^>]*>/, '')
    .replace(STYLE_PATTERN, '')
    .replace(/<\/svg>\s*$/, '');
}

export function getTileBundle(tile, size) {
  return {
    zoom: tile.zoom,
    x: Math.floor(tile.x / size),
    y: Math.floor(tile.y / size),
    offsetX: tile.x % size,
    offsetY: tile.y % size,
    size,
  };
}

export function renderTileBundle(entries, size) {
  if (!entries.length) return '';
  const style = entries[0].svg.match(STYLE_PATTERN)?.[0] ?? '';
  const content = entries
    .sort((left, right) =>
      left.tile.y === right.tile.y
        ? left.tile.x - right.tile.x
        : left.tile.y - right.tile.y,
    )
    .map(({ tile, svg }) => {
      const bundle = getTileBundle(tile, size);
      const x = bundle.offsetX * TILE_SIZE;
      const y = bundle.offsetY * TILE_SIZE;
      return (
        `<svg x="${x}" y="${y}" width="${TILE_SIZE}" ` +
        `height="${TILE_SIZE}" viewBox="0 0 ${TILE_SIZE} ${TILE_SIZE}" ` +
        `overflow="hidden">${tileBody(svg)}</svg>`
      );
    })
    .join('');
  const extent = size * TILE_SIZE;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" ` +
    `viewBox="0 0 ${extent} ${extent}">${style}${content}</svg>\n`
  );
}

function groupTiles(tiles, levels) {
  const groups = new Map();
  for (const entry of tiles) {
    const size = levels[entry.tile.zoom];
    if (!size) continue;
    const bundle = getTileBundle(entry.tile, size);
    const key = `${bundle.zoom}:${bundle.x}:${bundle.y}`;
    const group = groups.get(key) ?? { bundle, entries: [] };
    group.entries.push(entry);
    groups.set(key, group);
  }
  return groups;
}

export async function writeTileBundles({ output, tiles, levels }) {
  const groups = groupTiles(tiles, levels);
  const summary = { bundles: 0, bytes: 0, levels: {} };
  for (const zoom of Object.keys(levels)) {
    await rm(path.join(output, zoom), { recursive: true, force: true });
    await rm(path.join(output, 'bundles', zoom), {
      recursive: true,
      force: true,
    });
  }
  for (const { bundle, entries } of groups.values()) {
    const svg = renderTileBundle(entries, bundle.size);
    const directory = path.join(
      output,
      'bundles',
      String(bundle.zoom),
      String(bundle.x),
    );
    const destination = path.join(directory, `${bundle.y}.svg`);
    await mkdir(directory, { recursive: true });
    await writeFile(`${destination}.tmp`, svg);
    await rename(`${destination}.tmp`, destination);
    const bundleBytes = Buffer.byteLength(svg);
    const level = summary.levels[bundle.zoom] ?? { bundles: 0, bytes: 0 };
    level.bundles += 1;
    level.bytes += bundleBytes;
    summary.levels[bundle.zoom] = level;
    summary.bundles += 1;
    summary.bytes += bundleBytes;
  }
  return summary;
}
