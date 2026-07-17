import { createPreviewViewport } from './viewport.js';
import { lookup } from '../../../i18n/index.js';

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
  let size = null;
  let sizeRequest = null;
  const sizeElements = {
    width: e.qrWidth, widthValue: e.qrWidthValue, widthAuto: e.qrWidthAuto,
    scale: e.qrScale, scaleValue: e.qrScaleValue,
    margin: e.qrMargin, marginValue: e.qrMarginValue,
    printAuto: e.printWidthAuto, printWidth: e.printWidth,
    printValue: e.printWidthValue,
  };
  const getMetrics = () => ({ width: renderedWidth, scale: moduleScale });
  const getAutomaticPrintWidth = (source = e.canvas) => {
    const pixelWidth = source.width || renderedWidth || Number.parseInt(e.qrWidth.value, 10) || 320;
    const scale = moduleScale || Number.parseInt(e.qrScale.value, 10) || 4;
    const totalModules = Math.max(1, Math.round(pixelWidth / scale));
    return Math.min(7, Math.max(
      0.5,
      pixelWidth / pixelsPerInch,
      totalModules * minPrintModuleInches,
    ));
  };
  const getPrintWidth = (source = e.canvas) => {
    if (size) return size.getPrintWidth(source);
    return e.printWidthAuto.checked
      ? getAutomaticPrintWidth(source)
      : Math.min(7, Math.max(0.5, Number.parseFloat(e.printWidth.value) || 1.65));
  };
  const syncPrint = () => {
    if (size) {
      size.syncPrint();
      return;
    }
    const automatic = getAutomaticPrintWidth();
    if (e.printWidthAuto.checked) e.printWidth.value = automatic.toFixed(2);
    e.printWidth.disabled = e.printWidthAuto.checked;
    const selected = getPrintWidth();
    const totalModules = Math.max(1, Math.round(
      (renderedWidth || e.canvas.width || 320) / (moduleScale || 4),
    ));
    e.printWidthValue.textContent = lookup('preview.printSize', '{inches} in{automatic} - {millimeters} mm/module', {
      inches: selected.toFixed(2), automatic: e.printWidthAuto.checked ? ` ${lookup('common.autoLower', 'auto')}` : '',
      millimeters: ((selected / totalModules) * 25.4).toFixed(2),
    });
  };
  const loadSize = () => {
    if (size) return Promise.resolve(size);
    if (!sizeRequest) {
      sizeRequest = import('./size.js').then(({ createPreviewSizeControls }) => {
        size = createPreviewSizeControls({
          canvas: e.canvas,
          elements: sizeElements,
          getMetrics,
          pixelsPerInch,
          minPrintModuleInches,
        });
        size.syncLabels();
        return size;
      }).catch((error) => {
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
    setRenderMetrics(width, scale) { renderedWidth = width; moduleScale = scale; },
    setViewMode: viewport.setMode,
    syncLabels: () => size?.syncLabels(),
    syncPrint,
  };
}
