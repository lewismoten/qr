import { createPreviewSizeControls } from './size.js';
import { createPreviewViewport } from './viewport.js';

export function createPreviewControlsSetup({ elements: e, pixelsPerInch, minPrintModuleInches }) {
  let renderedWidth = null;
  let moduleScale = null;
  const viewport = createPreviewViewport({
    viewport: e.qrPreviewViewport,
    canvas: e.canvas,
    controls: e.previewViewControls,
    fitButton: e.previewViewFit,
    actualButton: e.previewViewActual,
    getRenderMetrics: () => ({ renderedWidth, moduleScale }),
  });
  const size = createPreviewSizeControls({
    canvas: e.canvas,
    elements: {
      width: e.qrWidth, widthValue: e.qrWidthValue, widthAuto: e.qrWidthAuto,
      scale: e.qrScale, scaleValue: e.qrScaleValue,
      margin: e.qrMargin, marginValue: e.qrMarginValue,
      printAuto: e.printWidthAuto, printWidth: e.printWidth,
      printValue: e.printWidthValue,
    },
    getMetrics: () => ({ width: renderedWidth, scale: moduleScale }),
    pixelsPerInch,
    minPrintModuleInches,
  });

  return {
    formatWidth: size.formatWidth,
    getPrintWidth: size.getPrintWidth,
    scheduleViewportSync: viewport.scheduleSync,
    setRenderMetrics(width, scale) { renderedWidth = width; moduleScale = scale; },
    setViewMode: viewport.setMode,
    syncLabels: size.syncLabels,
    syncPrint: size.syncPrint,
  };
}
