import { createEncodingDiagnostics } from './encoding.js';
import { createMaskSelector } from './mask-selector.js';
import { moduleIsDark } from './model.js';
import { createOutlineSelector } from './outline.js';
import { createDebugStyles } from './styles.js';

export function createDebugSetup({ elements: e, encoder, config, helpers, runtime }) {
  const diagnostics = createEncodingDiagnostics({
    encoder, modeLabels: config.modeLabels, modeCapacity: config.modeCapacity,
    alphanumericCharacters: config.alphanumericCharacters,
    elements: e.diagnostics, getCurrentMode: helpers.getCurrentMode,
    getFormat: () => e.format.value,
    getActiveFieldset: (format) => document.querySelector(`.format-fields[data-format-fields="${format}"]`),
    isBulkMode: helpers.isBulkMode, buildDebugModel: helpers.buildDebugModel,
  });
  const styles = createDebugStyles({
    colors: e.colors, getContrastingHex: helpers.getContrastingHex,
    getCategory: helpers.getDebugCategory,
  });
  const buildMaskOptions = (value) => {
    const options = {
      errorCorrectionLevel: helpers.getErrorLevel().value, margin: 1, width: 72,
      color: {
        dark: helpers.colorWithTransparency(e.darkColor.value.trim() || '#111827', e.darkTransparency),
        light: helpers.colorWithTransparency(e.lightColor.value.trim() || '#ffffff', e.lightTransparency),
      },
    };
    if (value !== '') options.maskPattern = Number.parseInt(value, 10);
    return options;
  };
  const masks = createMaskSelector({
    grid: e.maskGrid, input: e.maskPattern, values: config.maskValues,
    labels: config.maskLabels, encoder, moduleIsDark, buildOptions: buildMaskOptions,
    onChange: () => runtime.render(),
  });
  const outlines = createOutlineSelector({
    buttons: e.outlineButtons, defaultValue: runtime.getOutlineMode(),
    onChange(value) {
      runtime.setOutlineMode(value);
      runtime.render();
    },
  });
  return { diagnostics, styles, masks, outlines };
}
