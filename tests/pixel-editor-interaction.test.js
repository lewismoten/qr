import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, test } from 'node:test';

const source = await readFile(
  new URL('../src/js/app/ui/style/art/pixel-editor.js', import.meta.url),
  'utf8',
);

describe('pixel editor interaction', () => {
  test('prevents palette and cell buttons from scrolling their panel', () => {
    const paletteHandler = source.slice(
      source.indexOf("paletteElement.addEventListener('click'"),
      source.indexOf("customColorInput.addEventListener('input'"),
    );
    const gridHandler = source.slice(
      source.indexOf("grid.addEventListener('click'"),
      source.indexOf("window.addEventListener('pointerup'"),
    );

    assert.match(paletteHandler, /event\.preventDefault\(\)/);
    assert.match(gridHandler, /event\.preventDefault\(\)/);
    assert.match(gridHandler, /paintCell\(cell\)/);
  });
});
