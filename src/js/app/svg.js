export async function createSvgBlob(sourceCanvas) {
  const context = sourceCanvas.getContext('2d');
  const pixels = context.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height).data;
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
      const offset = (y * sourceCanvas.width + x) * 4;
      const red = pixels[offset];
      const green = pixels[offset + 1];
      const blue = pixels[offset + 2];
      const alpha = pixels[offset + 3];
      if (alpha === 0) {
        x += 1;
        continue;
      }

      let end = x + 1;
      while (end < sourceCanvas.width) {
        const nextOffset = (y * sourceCanvas.width + end) * 4;
        if (
          pixels[nextOffset] !== red ||
          pixels[nextOffset + 1] !== green ||
          pixels[nextOffset + 2] !== blue ||
          pixels[nextOffset + 3] !== alpha
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
    const hex = `#${[red, green, blue].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
    const opacity = alpha < 255 ? ` fill-opacity="${(alpha / 255).toFixed(4)}"` : '';
    parts.push(`<path fill="${hex}"${opacity} d="${paths.join('')}"/>`);
  });
  parts.push('</svg>');
  return new Blob(parts, { type: 'image/svg+xml' });
}

