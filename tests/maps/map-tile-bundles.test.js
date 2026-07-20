import assert from 'node:assert/strict';
import { mkdtemp, readFile, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import {
  getTileBundle,
  renderTileBundle,
  writeTileBundles,
} from '../../scripts/maps/tile-bundles.mjs';

const svg = (content) =>
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">' +
  `<style>.country{fill:red}</style>${content}</svg>\n`;

test('composes child SVGs into a shared-style supertile', () => {
  const entries = [
    { tile: { zoom: 7, x: 5, y: 8 }, svg: svg('<path id="right"/>') },
    { tile: { zoom: 7, x: 4, y: 8 }, svg: svg('<path id="left"/>') },
  ];
  const output = renderTileBundle(entries, 4);
  assert.match(output, /viewBox="0 0 1024 1024"/);
  assert.equal(output.match(/<style>/g).length, 1);
  assert.match(output, /<svg x="0" y="0"[^>]+overflow="hidden">.*id="left"/);
  assert.match(output, /<svg x="256" y="0"[^>]+overflow="hidden">.*id="right"/);
  assert.deepEqual(getTileBundle({ zoom: 7, x: 5, y: 8 }, 4), {
    zoom: 7,
    x: 1,
    y: 2,
    offsetX: 1,
    offsetY: 0,
    size: 4,
  });
  assert.equal(renderTileBundle([], 4), '');
});

test('writes grouped bundles and removes individual levels', async () => {
  const output = await mkdtemp(path.join(os.tmpdir(), 'qr-map-bundles-'));
  const tiles = [
    { tile: { zoom: 7, x: 4, y: 8 }, svg: svg('<path/>') },
    { tile: { zoom: 7, x: 7, y: 11 }, svg: svg('<circle/>') },
  ];
  const summary = await writeTileBundles({
    output,
    tiles,
    levels: { 7: 4 },
  });
  const bundlePath = path.join(output, 'bundles/7/1/2.svg');
  assert.match(await readFile(bundlePath, 'utf8'), /<path\/>.*<circle\/>/);
  assert.equal(summary.bundles, 1);
  assert.equal(summary.levels[7].bundles, 1);
  assert.equal(summary.bytes, (await stat(bundlePath)).size);
});
