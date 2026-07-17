import { createInvalidPreviewRenderer } from './invalid.js';
import { createRenderController } from './render.js';
import { createQrRenderer } from './qr-renderer.js';

export function createPreviewSetup({ e, encoder, debugColors, maxTargetWidth, systems,
  helpers, actions, runtime }) {
  const content = {
    getFrameMessage: systems.content.pipeline.frame.getMessage,
    getFrameFont: systems.content.pipeline.frame.getFont,
    buildText: systems.content.pipeline.payload.build,
    buildOptions: systems.content.qr.buildOptions,
    buildPreview: systems.content.pipeline.payload.preview,
    updateTextPreview: systems.content.updateTextPreview,
    updateOptionsPreview: systems.content.updateOptionsPreview,
    getValidation: systems.content.validation,
    buildPayload: systems.content.qr.buildPayload,
    createDefinition: systems.content.qr.createDefinition,
  };
  const debug = {
    setup: systems.debug,
    isOverlayActive: runtime.isDebugOverlayActive,
    getCodewordStyle: systems.debug.styles.getCodewordStyle,
    getModuleContrastColor: systems.debug.styles.getModuleContrastColor,
    getOutlineMode: runtime.getOutlineMode,
    setValidation: systems.debug.diagnostics.setValidation,
    updateSummary: systems.debug.diagnostics.updateSummary,
    validateMode: systems.debug.diagnostics.validateManualMode,
  };
  const style = {
    getModuleOptions: systems.style.modules.getOptions,
    getEyeOptions: systems.style.eyes.getOptions,
    getGradientOptions: systems.style.colors.getGradientOptions,
    imageFill: systems.style.imageFill,
    centerLogo: systems.style.centerLogo,
    pixelEditor: systems.style.pixelEditor,
  };
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
    schedulePreviewViewportSync: systems.previewControls.scheduleViewportSync,
    setRenderMetrics: systems.previewControls.setRenderMetrics,
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
    syncOutputs: systems.output.sync,
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
    syncDownloads: systems.download.syncControls,
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
