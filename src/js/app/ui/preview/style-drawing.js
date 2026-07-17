let shapeDrawing = null;
let artworkDrawing = null;

export const installShapeDrawing = (implementation) => { shapeDrawing = implementation; };
export const installArtworkDrawing = (implementation) => { artworkDrawing = implementation; };

export function drawQrModule(context, x, y, cellSize, options) {
  if (shapeDrawing) {
    shapeDrawing.drawQrModule(context, x, y, cellSize, options);
    return;
  }
  context.fillRect(x, y, Math.ceil(cellSize), Math.ceil(cellSize));
}

export function drawFinderEyes(...args) {
  shapeDrawing?.drawFinderEyes(...args);
}

export function createQrImageLayer(...args) {
  return shapeDrawing?.createQrImageLayer(...args) ?? null;
}

export function createQrModuleFill(context, startColor, options, marginModules, moduleCount, cellSize) {
  return shapeDrawing?.createQrModuleFill(
    context,
    startColor,
    options,
    marginModules,
    moduleCount,
    cellSize,
  ) ?? startColor;
}

export function drawCenterArtwork(...args) {
  artworkDrawing?.drawCenterArtwork(...args);
}
