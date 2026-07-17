export function createPreviewSizeControls({ canvas, elements: e, getMetrics, pixelsPerInch, minPrintModuleInches }) {
  const getAutomaticPrintWidth = (source = canvas) => {
    const metrics = getMetrics();
    const pixelWidth = source.width || metrics.width || Number.parseInt(e.width.value, 10) || 320;
    const moduleScale = metrics.scale || Number.parseInt(e.scale.value, 10) || 4;
    const totalModules = Math.max(1, Math.round(pixelWidth / moduleScale));
    return Math.min(7, Math.max(0.5, pixelWidth / pixelsPerInch, totalModules * minPrintModuleInches));
  };
  const getPrintWidth = (source = canvas) => e.printAuto.checked
    ? getAutomaticPrintWidth(source)
    : Math.min(7, Math.max(0.5, Number.parseFloat(e.printWidth.value) || 1.65));
  const syncPrint = () => {
    const automatic = getAutomaticPrintWidth();
    if (e.printAuto.checked) e.printWidth.value = automatic.toFixed(2);
    e.printWidth.disabled = e.printAuto.checked;
    const selected = getPrintWidth();
    const metrics = getMetrics();
    const totalModules = Math.max(1, Math.round((metrics.width || canvas.width || 320) / (metrics.scale || 4)));
    e.printValue.textContent = `${selected.toFixed(2)} in${e.printAuto.checked ? ' auto' : ''} - ${((selected / totalModules) * 25.4).toFixed(2)} mm/module`;
  };
  const formatWidth = () => {
    const minimum = Number.parseInt(e.width.min, 10) || 1;
    const metrics = getMetrics();
    const width = e.widthAuto.checked ? (metrics.width ?? minimum) : (Number.parseInt(e.width.value, 10) || minimum);
    const scale = metrics.scale ?? e.scale.value;
    e.widthValue.textContent = `${width} px · ${scale} px/module · ${(width / pixelsPerInch).toFixed(2)} in at ${pixelsPerInch} ppi`;
  };
  const syncLabels = () => {
    formatWidth();
    e.scaleValue.textContent = e.scale.value;
    e.marginValue.textContent = e.margin.value;
  };
  return { getPrintWidth, syncPrint, formatWidth, syncLabels };
}
