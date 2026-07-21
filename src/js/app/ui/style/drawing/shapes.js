import { COLOR_BLACK } from '../../../colors.js';
import {
  getFinderPatternPart,
  isFinderPattern,
} from '../../../qr/qr-finder-regions.js';
import { HALF_TURN_DEGREES, STYLE_PERCENT_SCALE } from '../style-values.js';
import { getEyeGeometry, getModuleGeometry } from './shape-geometry.js';

const FINDER_OUTER_MODULES = 7;
const FINDER_INNER_MODULES = 5;
const FINDER_CENTER_MODULES = 3;

export { getFinderPatternPart, isFinderPattern };

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

export function drawQrModule(context, x, y, cellSize, options) {
  const geometry = getModuleGeometry(options);
  if (!geometry || cellSize < 2) {
    context.fillRect(x, y, Math.ceil(cellSize), Math.ceil(cellSize));
    return;
  }
  const inset = cellSize * (geometry.inset / STYLE_PERCENT_SCALE);
  const size = Math.max(0, cellSize - inset * 2);
  context.save();
  context.translate(x + cellSize / 2, y + cellSize / 2);
  context.rotate((geometry.rotation * Math.PI) / HALF_TURN_DEGREES);
  addRoundedRectPath(
    context,
    -size / 2,
    -size / 2,
    size,
    size,
    size * (geometry.rounding / STYLE_PERCENT_SCALE),
  );
  context.restore();
  context.fill();
}

export function fillEyeShape(context, x, y, size, rounding, fillStyle) {
  context.fillStyle = fillStyle;
  addRoundedRectPath(
    context,
    x,
    y,
    size,
    size,
    size * (rounding / STYLE_PERCENT_SCALE),
  );
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
    [0, moduleCount - FINDER_OUTER_MODULES],
    [moduleCount - FINDER_OUTER_MODULES, 0],
  ].forEach(([row, column]) => {
    const x = (column + marginModules) * cellSize;
    const y = (row + marginModules) * cellSize;
    if (imageFillOptions) {
      fillImageEye(
        context,
        x,
        y,
        cellSize * FINDER_OUTER_MODULES,
        geometry.outerRounding,
        imageFillOptions.pattern,
        imageFillOptions.darkFillStyle,
      );
      fillImageEye(
        context,
        x + cellSize,
        y + cellSize,
        cellSize * FINDER_INNER_MODULES,
        geometry.outerRounding,
        imageFillOptions.pattern,
        imageFillOptions.lightFillStyle,
      );
      fillImageEye(
        context,
        x + cellSize * 2,
        y + cellSize * 2,
        cellSize * FINDER_CENTER_MODULES,
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
      cellSize * FINDER_OUTER_MODULES,
      geometry.outerRounding,
      outerFillStyle,
    );
    context.save();
    context.globalCompositeOperation = 'destination-out';
    fillEyeShape(
      context,
      x + cellSize,
      y + cellSize,
      cellSize * FINDER_INNER_MODULES,
      geometry.outerRounding,
      COLOR_BLACK,
    );
    context.restore();
    if (!transparentLight) {
      fillEyeShape(
        context,
        x + cellSize,
        y + cellSize,
        cellSize * FINDER_INNER_MODULES,
        geometry.outerRounding,
        lightColor,
      );
    }
    fillEyeShape(
      context,
      x + cellSize * 2,
      y + cellSize * 2,
      cellSize * FINDER_CENTER_MODULES,
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
    const radians = (options.angle * Math.PI) / HALF_TURN_DEGREES;
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
