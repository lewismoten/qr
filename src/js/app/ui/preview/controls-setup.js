import { createPreviewViewport } from './viewport.js';
import { lookup } from '../../../i18n/index.js';

const DECIMAL_RADIX = 10;
const DEFAULT_PREVIEW_PIXELS = 320;
const DEFAULT_MODULE_SCALE = 4;
const MINIMUM_PRINT_WIDTH_INCHES = 0.5;
const MAXIMUM_PRINT_WIDTH_INCHES = 7;
const DEFAULT_PRINT_WIDTH_INCHES = 1.65;
const MILLIMETERS_PER_INCH = 25.4;

export function createPreviewControlsSetup({
  document,
  elements: e,
  pixelsPerInch,
  minPrintModuleInches,
}) {
  let renderedWidth = null;
  let moduleScale = null;
  let printElements = null;
  const viewport = createPreviewViewport({
    viewport: e.qrPreviewViewport,
    canvas: e.canvas,
    controls: e.previewViewControls,
    fitButton: e.previewViewFit,
    actualButton: e.previewViewActual,
    getRenderMetrics: () => ({ renderedWidth, moduleScale }),
  });
  let size = null;
  let sizeRequest = null;
  const hasPrintElements = () =>
    Boolean(
      printElements?.printWidthAuto &&
      printElements.printWidth &&
      printElements.printWidthValue,
    );
  const deferredPrintAuto = {
    get checked() {
      return printElements?.printWidthAuto?.checked ?? true;
    },
  };
  const deferredPrintWidth = {
    get value() {
      return printElements?.printWidth?.value ?? '1.65';
    },
    set value(value) {
      if (printElements?.printWidth) printElements.printWidth.value = value;
    },
    set disabled(value) {
      if (printElements?.printWidth) printElements.printWidth.disabled = value;
    },
  };
  const deferredPrintValue = {
    set textContent(value) {
      if (printElements?.printWidthValue)
        printElements.printWidthValue.textContent = value;
    },
  };
  const getSizeElements = () => ({
    width: e.qrWidth,
    widthValue: document.getElementById('qr-width-value'),
    widthAuto: e.qrWidthAuto,
    scale: e.qrScale,
    scaleValue: document.getElementById('qr-scale-value'),
    margin: e.qrMargin,
    marginValue: document.getElementById('qr-margin-value'),
    printAuto: deferredPrintAuto,
    printWidth: deferredPrintWidth,
    printValue: deferredPrintValue,
  });
  const getMetrics = () => ({ width: renderedWidth, scale: moduleScale });
  const getAutomaticPrintWidth = (source = e.canvas) => {
    const pixelWidth =
      source.width ||
      renderedWidth ||
      Number.parseInt(e.qrWidth.value, DECIMAL_RADIX) ||
      DEFAULT_PREVIEW_PIXELS;
    const scale =
      moduleScale ||
      Number.parseInt(e.qrScale.value, DECIMAL_RADIX) ||
      DEFAULT_MODULE_SCALE;
    const totalModules = Math.max(1, Math.round(pixelWidth / scale));
    return Math.min(
      MAXIMUM_PRINT_WIDTH_INCHES,
      Math.max(
        MINIMUM_PRINT_WIDTH_INCHES,
        pixelWidth / pixelsPerInch,
        totalModules * minPrintModuleInches,
      ),
    );
  };
  const getPrintWidth = (source = e.canvas) => {
    if (size) return size.getPrintWidth(source);
    if (!hasPrintElements()) return getAutomaticPrintWidth(source);
    return printElements.printWidthAuto.checked
      ? getAutomaticPrintWidth(source)
      : Math.min(
          MAXIMUM_PRINT_WIDTH_INCHES,
          Math.max(
            MINIMUM_PRINT_WIDTH_INCHES,
            Number.parseFloat(printElements.printWidth.value) ||
              DEFAULT_PRINT_WIDTH_INCHES,
          ),
        );
  };
  const syncPrint = () => {
    if (size) {
      size.syncPrint();
      return;
    }
    if (!hasPrintElements()) return;
    const automatic = getAutomaticPrintWidth();
    if (printElements.printWidthAuto.checked) {
      printElements.printWidth.value = automatic.toFixed(2);
    }
    printElements.printWidth.disabled = printElements.printWidthAuto.checked;
    const selected = getPrintWidth();
    const totalModules = Math.max(
      1,
      Math.round(
        (renderedWidth || e.canvas.width || DEFAULT_PREVIEW_PIXELS) /
          (moduleScale || DEFAULT_MODULE_SCALE),
      ),
    );
    printElements.printWidthValue.textContent = lookup(
      'preview.printSize',
      '{inches} in{automatic} - {millimeters} mm/module',
      {
        inches: selected.toFixed(2),
        automatic: printElements.printWidthAuto.checked
          ? ` ${lookup('common.autoLower', 'auto')}`
          : '',
        millimeters: ((selected / totalModules) * MILLIMETERS_PER_INCH).toFixed(
          2,
        ),
      },
    );
  };
  const loadSize = () => {
    if (size) return Promise.resolve(size);
    if (!sizeRequest) {
      sizeRequest = Promise.all([
        import('./size.js'),
        import('../download/print-elements.js'),
      ])
        .then(([{ createPreviewSizeControls }, { getPrintElements }]) => {
          printElements ??= getPrintElements(document);
          size = createPreviewSizeControls({
            canvas: e.canvas,
            elements: getSizeElements(),
            getMetrics,
            pixelsPerInch,
            minPrintModuleInches,
          });
          size.syncLabels();
          return size;
        })
        .catch((error) => {
          sizeRequest = null;
          throw error;
        });
    }
    return sizeRequest;
  };

  return {
    formatWidth: () => size?.formatWidth(),
    getPrintWidth,
    loadSize,
    scheduleViewportSync: viewport.scheduleSync,
    setRenderMetrics(width, scale) {
      renderedWidth = width;
      moduleScale = scale;
    },
    setViewMode: viewport.setMode,
    syncLabels: () => size?.syncLabels(),
    syncPrint,
    connectPrintElements(elements) {
      printElements = elements;
    },
  };
}
