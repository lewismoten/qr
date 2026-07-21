import { lookup } from '../../../i18n/index.js';

const DECIMAL_RADIX = 10;
const DEFAULT_PREVIEW_PIXELS = 320;
const DEFAULT_MODULE_SCALE = 4;
const MINIMUM_PRINT_WIDTH_INCHES = 0.5;
const MAXIMUM_PRINT_WIDTH_INCHES = 7;
const DEFAULT_PRINT_WIDTH_INCHES = 1.65;
const MILLIMETERS_PER_INCH = 25.4;

export function createPreviewSizeControls({
  canvas,
  elements: e,
  getMetrics,
  pixelsPerInch,
  minModuleInches,
}) {
  const getAutomaticPrintWidth = (source = canvas) => {
    const metrics = getMetrics();
    const pixelWidth =
      source.width ||
      metrics.width ||
      Number.parseInt(e.width.value, DECIMAL_RADIX) ||
      DEFAULT_PREVIEW_PIXELS;
    const moduleScale =
      metrics.scale ||
      Number.parseInt(e.scale.value, DECIMAL_RADIX) ||
      DEFAULT_MODULE_SCALE;
    const totalModules = Math.max(1, Math.round(pixelWidth / moduleScale));
    return Math.min(
      MAXIMUM_PRINT_WIDTH_INCHES,
      Math.max(
        MINIMUM_PRINT_WIDTH_INCHES,
        pixelWidth / pixelsPerInch,
        totalModules * minModuleInches,
      ),
    );
  };
  const getPrintWidth = (source = canvas) =>
    e.printAuto.checked
      ? getAutomaticPrintWidth(source)
      : Math.min(
          MAXIMUM_PRINT_WIDTH_INCHES,
          Math.max(
            MINIMUM_PRINT_WIDTH_INCHES,
            Number.parseFloat(e.printWidth.value) || DEFAULT_PRINT_WIDTH_INCHES,
          ),
        );
  const syncPrint = () => {
    const automatic = getAutomaticPrintWidth();
    if (e.printAuto.checked) e.printWidth.value = automatic.toFixed(2);
    e.printWidth.disabled = e.printAuto.checked;
    const selected = getPrintWidth();
    const metrics = getMetrics();
    const totalModules = Math.max(
      1,
      Math.round(
        (metrics.width || canvas.width || DEFAULT_PREVIEW_PIXELS) /
          (metrics.scale || DEFAULT_MODULE_SCALE),
      ),
    );
    e.printValue.textContent = lookup(
      'preview.printSize',
      '{inches} in{automatic} - {millimeters} mm/module',
      {
        inches: selected.toFixed(2),
        automatic: e.printAuto.checked
          ? ` ${lookup('common.autoLower', 'auto')}`
          : '',
        millimeters: ((selected / totalModules) * MILLIMETERS_PER_INCH).toFixed(
          2,
        ),
      },
    );
  };
  const formatWidth = () => {
    const minimum = Number.parseInt(e.width.min, DECIMAL_RADIX) || 1;
    const metrics = getMetrics();
    const width = e.widthAuto.checked
      ? (metrics.width ?? minimum)
      : Number.parseInt(e.width.value, DECIMAL_RADIX) || minimum;
    const scale = metrics.scale ?? e.scale.value;
    e.widthValue.textContent = lookup(
      'preview.width',
      '{width} px · {scale} px/module · {inches} in at {ppi} ppi',
      {
        width,
        scale,
        inches: (width / pixelsPerInch).toFixed(2),
        ppi: pixelsPerInch,
      },
    );
  };
  const syncLabels = () => {
    formatWidth();
    e.scaleValue.textContent = e.scale.value;
    e.marginValue.textContent = e.margin.value;
  };
  return { getPrintWidth, syncPrint, formatWidth, syncLabels };
}
