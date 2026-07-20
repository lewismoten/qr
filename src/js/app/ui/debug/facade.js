function moduleIsDark(qrDefinition, row, column) {
  if (typeof qrDefinition.modules.get === 'function') {
    return qrDefinition.modules.get(row, column);
  }
  return Boolean(
    qrDefinition.modules.data[row * qrDefinition.modules.size + column],
  );
}

export function createDebugFacade(options) {
  const colors = {};
  let featureElements = null;
  let controller = null;
  let request = null;
  const ensure = () => {
    if (controller) return Promise.resolve(controller);
    if (!request) {
      request = Promise.all([
        import('./setup/debug-lazy-setup.js'),
        import('../help-popovers.js'),
        import('./debug-elements.js'),
      ])
        .then(
          ([
            { createLazyDebugSetup },
            { initializeHelpPopovers },
            { getDebugElements },
          ]) => {
            initializeHelpPopovers();
            featureElements = getDebugElements(
              options.document,
              options.elements,
            );
            controller = createLazyDebugSetup({
              ...options,
              elements: featureElements,
              colorElements: colors,
            });
            return controller;
          },
        )
        .catch((error) => {
          request = null;
          throw error;
        });
    }
    return request;
  };
  return {
    colors,
    isOverlayActive() {
      const state = options.runtime.getDebugState();
      return (
        (state.tab === 'debug' && state.subtab === 'overlay') ||
        (featureElements?.debugEnabled.checked ?? false)
      );
    },
    isUnmasked: () => featureElements?.debugUnmask.checked ?? false,
    getModeError: () => featureElements?.modeValidation.textContent ?? '',
    load: (name) => ensure().then((system) => system.load(name)),
    diagnostics: {
      setValidation: (...args) =>
        controller?.diagnostics.setValidation(...args),
      validateManualMode: (...args) =>
        controller?.diagnostics.validateManualMode(...args) ?? true,
      updateSummary: (...args) =>
        controller?.diagnostics.updateSummary(...args),
    },
    styles: {
      getCodewordStyle: (...args) =>
        controller?.styles.getCodewordStyle(...args) ?? {
          color: '#0ea5e9',
          strokeColor: COLOR_WHITE,
          opacity: 0.7,
        },
      getModuleContrastColor: (...args) =>
        controller?.styles.getModuleContrastColor(...args) ?? COLOR_WHITE,
    },
    masks: {
      ensure: (...args) => controller?.masks.ensure(...args),
      sync: (...args) => controller?.masks.sync(...args),
      renderPreviews: (...args) => controller?.masks.renderPreviews(...args),
    },
    outlines: {
      sync: (...args) => controller?.outlines.sync(...args),
    },
    renderer: {
      buildModel: (...args) => controller?.renderer.buildModel(...args) ?? null,
      getCategory: (...args) =>
        controller?.renderer.getCategory(...args) ?? 'data',
      moduleIsDark: (...args) =>
        controller?.renderer.moduleIsDark(...args) ?? moduleIsDark(...args),
      drawBoundaries: (...args) => controller?.renderer.drawBoundaries(...args),
      drawOutlines: (...args) => controller?.renderer.drawOutlines(...args),
      drawPaths: (...args) => controller?.renderer.drawPaths(...args),
      drawFieldStarts: (...args) =>
        controller?.renderer.drawFieldStarts(...args),
    },
  };
}
import { COLOR_WHITE } from '../../colors.js';
