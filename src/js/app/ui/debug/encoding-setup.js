import { createEncodingDiagnostics } from './encoding.js';
import { buildDebugOverlayModel } from './model.js';

export function createDebugEncodingSetup({ elements: e, config, encoder,
  getCurrentMode, isBulkMode }) {
  return createEncodingDiagnostics({
    encoder,
    modeLabels: config.modeLabels,
    modeCapacity: config.modeCapacity,
    alphanumericCharacters: config.alphanumericCharacters,
    elements: {
      detectedMode: e.detectedMode, segmentSummary: e.segmentSummary,
      versionSummary: e.versionSummary, capacitySummary: e.capacitySummary,
      unusedSummary: e.unusedSummary, modeValidation: e.modeValidation,
      formatValidation: e.formatValidation, encodedPreview: e.encodedPreview,
      bulkFields: e.bulkFields,
    },
    getCurrentMode,
    getFormat: () => e.qrFormat.value,
    getActiveFieldset: (format) => document.querySelector(`.format-fields[data-format-fields="${format}"]`),
    isBulkMode,
    buildDebugModel: buildDebugOverlayModel,
  });
}
