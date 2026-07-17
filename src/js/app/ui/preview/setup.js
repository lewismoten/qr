import { createInvalidPreviewRenderer } from './invalid.js';
import { createRenderController } from './render.js';
import { createQrRenderer } from './qr-renderer.js';

export function createPreviewSetup({ e, encoder, debugColors, maxTargetWidth, content,
  debug, style, helpers, actions, runtime }) {
  const drawQr = createQrRenderer({
    canvas: e.canvas,
    qrWidth: e.qrWidth,
    qrWidthAuto: e.qrWidthAuto,
    colorLight: e.colorLight,
    eyeCustomColorsEnabled: e.eyeCustomColorsEnabled,
    eyeOuterColor: e.eyeOuterColor,
    eyeCenterColor: e.eyeCenterColor,
    debugColors,
    debugUnmask: e.debugUnmask,
    centerArtMode: e.centerArtMode,
    centerEmoji: e.centerEmoji,
    centerArtSize: e.centerArtSize,
    centerArtBackground: e.centerArtBackground,
    pixelArtMatchModuleShape: e.pixelArtMatchModuleShape,
    moduleShape: e.moduleShape,
    frameMessageCenter: e.frameMessageCenter,
    frameLineHeight: e.frameLineHeight,
    frameMessageColor: e.frameMessageColor,
    maxTargetWidth,
    formatWidthLabel: helpers.formatWidthLabel,
    getCurrentFrameMessage: content.getFrameMessage,
    getFrameFont: content.getFrameFont,
    isDebugOverlayActive: debug.isOverlayActive,
    getCurrentModuleShapeOptions: style.getModuleOptions,
    getCurrentEyeShapeOptions: style.getEyeOptions,
    getCurrentGradientOptions: style.getGradientOptions,
    imageFillController: style.imageFill,
    getCodewordStyle: debug.getCodewordStyle,
    getModuleContrastColor: debug.getModuleContrastColor,
    centerLogoController: style.centerLogo,
    pixelArtEditor: style.pixelEditor,
    readInteger: helpers.readInteger,
    schedulePreviewViewportSync: runtime.scheduleViewportSync,
    setRenderMetrics: runtime.setRenderMetrics,
    getActiveDebugOutlineMode: debug.getOutlineMode,
  });

  const renderInvalid = createInvalidPreviewRenderer({
    canvas: e.canvas,
    encoder,
    drawQr,
    clearCanvas: helpers.clearCanvas,
  });
  const masks = debug.setup.masks;
  const controller = createRenderController({
    syncOutputs: actions.syncOutputs,
    syncFormat: actions.syncFormat,
    updateMap: actions.updateMap,
    buildText: content.buildText,
    buildOptions: content.buildOptions,
    buildPreview: content.buildPreview,
    updateTextPreview: content.updateTextPreview,
    updateOptionsPreview: content.updateOptionsPreview,
    syncMask: masks.sync,
    renderMasks: masks.renderPreviews,
    getValidation: content.getValidation,
    setValidation: debug.setValidation,
    renderInvalid,
    updateSummary: debug.updateSummary,
    validateMode: debug.validateMode,
    getModeError: () => e.modeValidation.textContent,
    buildPayload: content.buildPayload,
    createDefinition: content.createDefinition,
    drawQr,
    syncDownloads: actions.syncDownloads,
    showBuildError(error, options) {
      e.encodedPreview.textContent = error.message;
      e.encodedPreview.classList.add('has-error');
      renderInvalid(content.buildPreview(), options, error.message);
      debug.setValidation(error.message || 'Unable to build QR content.');
      console.error(error);
    },
  });

  return {
    cancel: controller.cancel,
    ensureMaskButtons: masks.ensure,
    render: controller.render,
    renderMaskPreviews: masks.renderPreviews,
    syncMaskSelection: masks.sync,
  };
}
