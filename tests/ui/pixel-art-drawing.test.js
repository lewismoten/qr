import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { getPixelArtLayout } from '../../src/js/app/ui/style/art/pixel-layout.js';

describe('pixel artwork protection', () => {
  test('creates outline geometry only for opaque pixels', () => {
    const layout = getPixelArtLayout(50, 20, {
      size: 2,
      pixels: ['#ff0000', null, '', undefined],
    });

    assert.equal(layout.pixels.length, 1);
    assert.deepEqual(layout.pixels[0], {
      color: '#ff0000',
      artX: 40,
      artY: 40,
      pixelSize: 10,
      row: 0,
      column: 0,
    });
    assert.equal(layout.outline, 2.5);
  });

  test('maps opaque cells to their rows and columns', () => {
    const layout = getPixelArtLayout(
      16,
      16,
      {
        size: 2,
        pixels: [null, '#00aa00', '#0000aa', null],
      },
      200,
    );

    assert.deepEqual(
      layout.pixels.map(({ color, row, column }) => ({
        color,
        row,
        column,
      })),
      [
        { color: '#00aa00', row: 0, column: 1 },
        { color: '#0000aa', row: 1, column: 0 },
      ],
    );
    assert.equal(layout.outline, 16);
  });
});
