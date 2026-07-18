import { createPreviewViewport } from './viewport.js';
import { lookup } from '../../../i18n/index.js';

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
  const getSizeElements = () => ({
    width: e.qrWidth,
    widthValue: document.getElementById('qr-width-value'),
    widthAuto: e.qrWidthAuto,
    scale: e.qrScale,
    scaleValue: document.getElementById('qr-scale-value'),
    margin: e.qrMargin,
    marginValue: document.getElementById('qr-margin-value'),
    printAuto: printElements.printWidthAuto,
    printWidth: printElements.printWidth,
    printValue: printElements.printWidthValue,
  });
  const getMetrics = () => ({ width: renderedWidth, scale: moduleScale });
  const getAutomaticPrintWidth = (source = e.canvas) => {
    const pixelWidth =
      source.width ||
      renderedWidth ||
      Number.parseInt(e.qrWidth.value, 10) ||
      320;
    const scale = moduleScale || Number.parseInt(e.qrScale.value, 10) || 4;
    const totalModules = Math.max(1, Math.round(pixelWidth / scale));
    return Math.min(
      7,
      Math.max(
        0.5,
        pixelWidth / pixelsPerInch,
        totalModules * minPrintModuleInches,
      ),
    );
  };
  const getPrintWidth = (source = e.canvas) => {
    if (size) return size.getPrintWidth(source);
    if (!printElements) return getAutomaticPrintWidth(source);
    return printElements.printWidthAuto.checked
      ? getAutomaticPrintWidth(source)
      : Math.min(
          7,
          Math.max(
            0.5,
            Number.parseFloat(printElements.printWidth.value) || 1.65,
          ),
        );
  };
  const syncPrint = () => {
    if (size) {
      size.syncPrint();
      return;
    }
    if (!printElements) return;
    const automatic = getAutomaticPrintWidth();
    if (printElements.printWidthAuto.checked) {
      printElements.printWidth.value = automatic.toFixed(2);
    }
    printElements.printWidth.disabled = printElements.printWidthAuto.checked;
    const selected = getPrintWidth();
    const totalModules = Math.max(
      1,
      Math.round((renderedWidth || e.canvas.width || 320) / (moduleScale || 4)),
    );
    printElements.printWidthValue.textContent = lookup(
      'preview.printSize',
      '{inches} in{automatic} - {millimeters} mm/module',
      {
        inches: selected.toFixed(2),
        automatic: printElements.printWidthAuto.checked
          ? ` ${lookup('common.autoLower', 'auto')}`
          : '',
        millimeters: ((selected / totalModules) * 25.4).toFixed(2),
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
