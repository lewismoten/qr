const RGBA_CHANNEL_COUNT = 4;
const GREEN_CHANNEL_OFFSET = 1;
const BLUE_CHANNEL_OFFSET = 2;
const ALPHA_CHANNEL_OFFSET = 3;
const OPAQUE_CHANNEL_VALUE = 255;
const HEX_RADIX = 16;
const HEX_CHANNEL_WIDTH = 2;
const OPACITY_DECIMAL_PLACES = 4;
const SVG_END = '</svg>';

export async function createSvgBlob(sourceCanvas) {
  const context = sourceCanvas.getContext('2d');
  const pixels = context.getImageData(
    0,
    0,
    sourceCanvas.width,
    sourceCanvas.height,
  ).data;
  const pathsByColor = new Map();
  let activeRuns = new Map();

  const appendRectangle = ({ x, y, width, height, color }) => {
    if (!pathsByColor.has(color)) {
      pathsByColor.set(color, []);
    }
    pathsByColor.get(color).push(`M${x} ${y}h${width}v${height}h-${width}z`);
  };

  for (let y = 0; y < sourceCanvas.height; y += 1) {
    const nextRuns = new Map();
    let x = 0;
    while (x < sourceCanvas.width) {
      const offset = (y * sourceCanvas.width + x) * RGBA_CHANNEL_COUNT;
      const red = pixels[offset];
      const green = pixels[offset + GREEN_CHANNEL_OFFSET];
      const blue = pixels[offset + BLUE_CHANNEL_OFFSET];
      const alpha = pixels[offset + ALPHA_CHANNEL_OFFSET];
      if (alpha === 0) {
        x += 1;
        continue;
      }

      let end = x + 1;
      while (end < sourceCanvas.width) {
        const nextOffset = (y * sourceCanvas.width + end) * RGBA_CHANNEL_COUNT;
        if (
          pixels[nextOffset] !== red ||
          pixels[nextOffset + GREEN_CHANNEL_OFFSET] !== green ||
          pixels[nextOffset + BLUE_CHANNEL_OFFSET] !== blue ||
          pixels[nextOffset + ALPHA_CHANNEL_OFFSET] !== alpha
        ) {
          break;
        }
        end += 1;
      }

      const color = `${red},${green},${blue},${alpha}`;
      const runKey = `${x},${end - x},${color}`;
      const previous = activeRuns.get(runKey);
      if (previous) {
        previous.height += 1;
        nextRuns.set(runKey, previous);
        activeRuns.delete(runKey);
      } else {
        nextRuns.set(runKey, { x, y, width: end - x, height: 1, color });
      }
      x = end;
    }
    activeRuns.forEach(appendRectangle);
    activeRuns = nextRuns;
  }
  activeRuns.forEach(appendRectangle);

  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${sourceCanvas.width}" height="${sourceCanvas.height}" viewBox="0 0 ${sourceCanvas.width} ${sourceCanvas.height}" shape-rendering="crispEdges">`,
  ];
  pathsByColor.forEach((paths, color) => {
    const [red, green, blue, alpha] = color.split(',').map(Number);
    const hex = `#${[red, green, blue]
      .map((channel) =>
        channel.toString(HEX_RADIX).padStart(HEX_CHANNEL_WIDTH, '0'),
      )
      .join('')}`;
    const opacity =
      alpha < OPAQUE_CHANNEL_VALUE
        ? ` fill-opacity="${(alpha / OPAQUE_CHANNEL_VALUE).toFixed(
            OPACITY_DECIMAL_PLACES,
          )}"`
        : '';
    parts.push(`<path fill="${hex}"${opacity} d="${paths.join('')}"/>`);
  });
  parts.push(SVG_END);
  return new Blob(parts, { type: 'image/svg+xml' });
}
