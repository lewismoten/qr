function addRoundedRectPath(context, x, y, width, height, radius) {
  const safeRadius = Math.max(0, Math.min(radius, width / 2, height / 2));
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(
    x + width,
    y + height,
    x + width - safeRadius,
    y + height,
  );
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
}

function getModuleGeometry(options = {}) {
  if (options.type === 'rounded')
    return { inset: 0, rounding: 32, rotation: 0 };
  if (options.type === 'dots') return { inset: 8, rounding: 50, rotation: 0 };
  if (options.type === 'diamond')
    return { inset: 15, rounding: 0, rotation: 45 };
  if (options.type !== 'custom') return null;
  return {
    inset: Math.min(30, Math.max(0, options.inset ?? 4)),
    rounding: Math.min(50, Math.max(0, options.rounding ?? 25)),
    rotation: Math.min(45, Math.max(-45, options.rotation ?? 0)),
  };
}

export function drawQrModule(context, x, y, cellSize, options) {
  const geometry = getModuleGeometry(options);
  if (!geometry || cellSize < 2) {
    context.fillRect(x, y, Math.ceil(cellSize), Math.ceil(cellSize));
    return;
  }
  const inset = cellSize * (geometry.inset / 100);
  const size = Math.max(0, cellSize - inset * 2);
  context.save();
  context.translate(x + cellSize / 2, y + cellSize / 2);
  context.rotate((geometry.rotation * Math.PI) / 180);
  addRoundedRectPath(
    context,
    -size / 2,
    -size / 2,
    size,
    size,
    size * (geometry.rounding / 100),
  );
  context.restore();
  context.fill();
}

function getEyeGeometry(options) {
  if (options.type === 'square') return { outerRounding: 0, centerRounding: 0 };
  if (options.type === 'rounded')
    return { outerRounding: 18, centerRounding: 32 };
  if (options.type === 'circle')
    return { outerRounding: 50, centerRounding: 50 };
  if (options.type !== 'custom') return null;
  return {
    outerRounding: Math.min(50, Math.max(0, options.outerRounding ?? 20)),
    centerRounding: Math.min(50, Math.max(0, options.centerRounding ?? 35)),
  };
}

export function fillEyeShape(context, x, y, size, rounding, fillStyle) {
  context.fillStyle = fillStyle;
  addRoundedRectPath(context, x, y, size, size, size * (rounding / 100));
  context.fill();
}

function fillImageEye(context, x, y, size, rounding, pattern, overlay) {
  fillEyeShape(context, x, y, size, rounding, pattern);
  fillEyeShape(context, x, y, size, rounding, overlay);
}

export function drawFinderEyes(
  context,
  moduleCount,
  marginModules,
  cellSize,
  eyeOptions,
  outerFillStyle,
  centerFillStyle,
  lightColor,
  transparentLight,
  imageFillOptions = null,
) {
  const geometry = getEyeGeometry(eyeOptions);
  if (!geometry) return;
  [
    [0, 0],
    [0, moduleCount - 7],
    [moduleCount - 7, 0],
  ].forEach(([row, column]) => {
    const x = (column + marginModules) * cellSize;
    const y = (row + marginModules) * cellSize;
    if (imageFillOptions) {
      fillImageEye(
        context,
        x,
        y,
        cellSize * 7,
        geometry.outerRounding,
        imageFillOptions.pattern,
        imageFillOptions.darkFillStyle,
      );
      fillImageEye(
        context,
        x + cellSize,
        y + cellSize,
        cellSize * 5,
        geometry.outerRounding,
        imageFillOptions.pattern,
        imageFillOptions.lightFillStyle,
      );
      fillImageEye(
        context,
        x + cellSize * 2,
        y + cellSize * 2,
        cellSize * 3,
        geometry.centerRounding,
        imageFillOptions.pattern,
        imageFillOptions.darkFillStyle,
      );
      return;
    }
    fillEyeShape(
      context,
      x,
      y,
      cellSize * 7,
      geometry.outerRounding,
      outerFillStyle,
    );
    context.save();
    context.globalCompositeOperation = 'destination-out';
    fillEyeShape(
      context,
      x + cellSize,
      y + cellSize,
      cellSize * 5,
      geometry.outerRounding,
      '#000000',
    );
    context.restore();
    if (!transparentLight) {
      fillEyeShape(
        context,
        x + cellSize,
        y + cellSize,
        cellSize * 5,
        geometry.outerRounding,
        lightColor,
      );
    }
    fillEyeShape(
      context,
      x + cellSize * 2,
      y + cellSize * 2,
      cellSize * 3,
      geometry.centerRounding,
      centerFillStyle,
    );
  });
}

function drawImageCover(context, image, x, y, width, height) {
  const imageWidth = image.naturalWidth || image.width;
  const imageHeight = image.naturalHeight || image.height;
  const scale = Math.max(width / imageWidth, height / imageHeight);
  const drawWidth = imageWidth * scale;
  const drawHeight = imageHeight * scale;
  context.drawImage(
    image,
    x + (width - drawWidth) / 2,
    y + (height - drawHeight) / 2,
    drawWidth,
    drawHeight,
  );
}

export function createQrImageLayer(context, image, qrStart, qrSize) {
  const layer = document.createElement('canvas');
  layer.width = context.canvas.width;
  layer.height = context.canvas.height;
  drawImageCover(
    layer.getContext('2d'),
    image,
    qrStart,
    qrStart,
    qrSize,
    qrSize,
  );
  return { layer, pattern: context.createPattern(layer, 'no-repeat') };
}

export function createQrModuleFill(
  context,
  startColor,
  options,
  marginModules,
  moduleCount,
  cellSize,
) {
  if (options.type === 'solid' || options.type === 'image') return startColor;
  const qrStart = marginModules * cellSize;
  const qrSize = moduleCount * cellSize;
  const center = qrStart + qrSize / 2;
  let gradient;
  if (options.type === 'radial') {
    gradient = context.createRadialGradient(
      center,
      center,
      0,
      center,
      center,
      (qrSize * Math.SQRT2) / 2,
    );
  } else {
    const radians = (options.angle * Math.PI) / 180;
    const cosine = Math.cos(radians);
    const sine = Math.sin(radians);
    const extent = (qrSize / 2) * (Math.abs(cosine) + Math.abs(sine));
    gradient = context.createLinearGradient(
      center - cosine * extent,
      center - sine * extent,
      center + cosine * extent,
      center + sine * extent,
    );
  }
  gradient.addColorStop(0, startColor);
  gradient.addColorStop(1, options.endColor);
  return gradient;
}
import {
  getFinderPatternPart,
  isFinderPattern,
} from '../../../qr/qr-finder-regions.js';

export { getFinderPatternPart, isFinderPattern };
