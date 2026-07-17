import { colorWithTransparency, getContrastingHex } from '../../colors.js';
import { buildDebugOverlayModel, getDebugCategory } from './model.js';
import { createDebugSetup } from './setup.js';

export function createApplicationDebugSetup({ elements: e, encoder, colors, config,
  isBulkMode, getCurrentMode, getErrorLevel, runtime }) {
  return createDebugSetup({
    elements: {
      format: e.qrFormat,
      diagnostics: {
        detectedMode: e.detectedMode, segmentSummary: e.segmentSummary,
        versionSummary: e.versionSummary, capacitySummary: e.capacitySummary,
        unusedSummary: e.unusedSummary, modeValidation: e.modeValidation,
        formatValidation: e.formatValidation, encodedPreview: e.encodedPreview,
        bulkFields: e.bulkFields,
      },
      colors,
      darkColor: e.colorDark,
      darkTransparency: e.colorDarkTransparency,
      lightColor: e.colorLight,
      lightTransparency: e.colorLightTransparency,
      maskGrid: e.maskGrid,
      maskPattern: e.maskPattern,
      outlineButtons: e.debugOutlineModeButtons,
    },
    encoder,
    config,
    helpers: {
      getCurrentMode,
      isBulkMode,
      buildDebugModel: buildDebugOverlayModel,
      getContrastingHex,
      getDebugCategory,
      getErrorLevel,
      colorWithTransparency,
    },
    runtime,
  });
}
