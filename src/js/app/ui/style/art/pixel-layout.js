import { STYLE_DEFAULTS, STYLE_PERCENT_SCALE } from '../style-values.js';

export function getPixelArtLayout(
  center,
  artSize,
  pixelArt,
  outlinePercent = STYLE_DEFAULTS.artwork.outlinePercent,
) {
  const pixelSize = artSize / pixelArt.size;
  const artX = center - artSize / 2;
  const artY = center - artSize / 2;
  const pixels = [];

  pixelArt.pixels.forEach((color, index) => {
    if (!color) return;
    pixels.push({
      color,
      artX,
      artY,
      pixelSize,
      row: Math.floor(index / pixelArt.size),
      column: index % pixelArt.size,
    });
  });

  return {
    outline: Math.max(1, pixelSize * (outlinePercent / STYLE_PERCENT_SCALE)),
    pixels,
  };
}
