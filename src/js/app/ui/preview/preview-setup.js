import { createInvalidPreviewRenderer } from './invalid.js';
import { createRenderController } from './render.js';
import { createQrRenderer } from './qr-renderer.js';
import { getErrorText, lookup } from '../../../i18n/index.js';

export function createPreviewSetup({
  e,
  encoder,
  debugColors,
  maxTargetWidth,
  systems,
  helpers,
  actions,
  runtime,
}) {
  const content = {
    getFrameMessage: systems.content.pipeline.frame.getMessage,
    getFrameFont: systems.content.pipeline.frame.getFont,
    buildText: systems.content.pipeline.payload.build,
    buildOptions: systems.content.qr.buildOptions,
    buildPreview: systems.content.pipeline.payload.preview,
    updatePreview: systems.content.updatePreview,
    getValidation: systems.content.validation,
    buildPayload: systems.content.qr.buildPayload,
    createDefinition: systems.content.qr.createDefinition,
  };
  const debug = {
    setup: systems.debug,
    isOverlayActive: runtime.isDebugOverlayActive,
    getCodewordStyle: systems.debug.styles.getCodewordStyle,
    getContrastColor: systems.debug.styles.getContrastColor,
    getOutlineMode: runtime.getOutlineMode,
    setValidation: systems.debug.diagnostics.setValidation,
    updateSummary: systems.debug.diagnostics.updateSummary,
    validateMode: systems.debug.diagnostics.validateMode,
  };
  const style = {
    getModuleOptions: systems.style.modules.getOptions,
    getEyeOptions: systems.style.eyes.getOptions,
    getGradientOptions: systems.style.colors.getGradientOptions,
    getEyeColors: systems.style.getEyeColors,
    getArtworkOptions: systems.style.artwork.getOptions,
    imageFill: systems.style.imageFill,
    centerLogo: systems.style.centerLogo,
    pixelEditor: systems.style.pixelEditor,
  };
  const drawQr = createQrRenderer({
    canvas: e.canvas,
    qrWidth: e.qrWidth,
    qrWidthAuto: e.qrWidthAuto,
    debugColors,
    isDebugUnmasked: systems.debug.isUnmasked,
    maxTargetWidth,
    formatWidthLabel: helpers.formatWidthLabel,
    getCurrentFrameMessage: content.getFrameMessage,
    getFrameFont: content.getFrameFont,
    isDebugOverlayActive: debug.isOverlayActive,
    getCurrentModuleShapeOptions: style.getModuleOptions,
    getCurrentEyeShapeOptions: style.getEyeOptions,
    getCurrentGradientOptions: style.getGradientOptions,
    getCurrentEyeColors: style.getEyeColors,
    getCurrentArtworkOptions: style.getArtworkOptions,
    getCurrentFrameOptions: systems.content.pipeline.frame.getRenderOptions,
    imageFillController: style.imageFill,
    getCodewordStyle: debug.getCodewordStyle,
    getContrastColor: debug.getContrastColor,
    centerLogoController: style.centerLogo,
    pixelArtEditor: style.pixelEditor,
    schedulePreviewViewportSync: systems.previewControls.scheduleViewportSync,
    setRenderMetrics: systems.previewControls.setRenderMetrics,
    getActiveDebugOutlineMode: debug.getOutlineMode,
    debugRenderer: systems.debug.renderer,
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
    updatePreview: content.updatePreview,
    syncMask: masks.sync,
    renderMasks: masks.renderPreviews,
    getValidation: content.getValidation,
    setValidation: debug.setValidation,
    renderInvalid,
    updateSummary: debug.updateSummary,
    validateMode: debug.validateMode,
    getModeError: systems.debug.getModeError,
    buildPayload: content.buildPayload,
    createDefinition: content.createDefinition,
    drawQr,
    syncDownloads: systems.download.syncControls,
    showBuildError(error, options) {
      const message = getErrorText(
        error,
        lookup('preview.buildError', 'Unable to build QR content.'),
      );
      e.encodedPreview.textContent = message;
      e.encodedPreview.classList.add('has-error');
      renderInvalid(content.buildPreview(), options, message);
      debug.setValidation(message);
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
