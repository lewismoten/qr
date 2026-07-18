import { loadFeatureStylesheet } from '../../../stylesheets.js';

function moduleIsDark(qrDefinition, row, column) {
  if (typeof qrDefinition.modules.get === 'function')
    return qrDefinition.modules.get(row, column);
  return Boolean(
    qrDefinition.modules.data[row * qrDefinition.modules.size + column],
  );
}

export function createLazyDebugSetup(options) {
  const requests = new Map();
  const colorElements = options.colorElements ?? {};
  let diagnostics = null;
  let masks = null;
  let overlay = null;
  const isActive = (name) => {
    const state = options.runtime.getDebugState();
    return state.tab === 'debug' && state.subtab === name;
  };

  const loadOnce = (name, loader) => {
    if (!requests.has(name)) {
      requests.set(
        name,
        loader().catch((error) => {
          requests.delete(name);
          throw error;
        }),
      );
    }
    return requests.get(name);
  };
  const loadEncoding = () =>
    loadOnce('encoding', () =>
      Promise.all([
        loadFeatureStylesheet('debug-encoding'),
        import('./encoding-setup.js'),
      ]).then(([, { createDebugEncodingSetup }]) => {
        diagnostics = createDebugEncodingSetup(options);
        return diagnostics;
      }),
    );
  const loadMask = () =>
    loadOnce('mask', () =>
      Promise.all([
        loadFeatureStylesheet('debug-mask'),
        import('./mask-setup.js'),
      ]).then(([, { createDebugMaskSetup }]) => {
        masks = createDebugMaskSetup({
          ...options,
          render: options.runtime.render,
        });
        return masks;
      }),
    );
  const loadOverlay = () =>
    loadOnce('overlay', () =>
      Promise.all([
        loadFeatureStylesheet('debug-overlay'),
        import('./overlay-setup.js'),
      ]).then(([, { createDebugOverlaySetup }]) => {
        overlay = createDebugOverlaySetup({
          elements: options.elements,
          colorElements,
          runtime: options.runtime,
        });
        return overlay;
      }),
    );

  return {
    colors: colorElements,
    diagnostics: {
      setValidation: (...args) => diagnostics?.setValidation(...args),
      validateManualMode: (...args) =>
        diagnostics?.validateManualMode(...args) ?? true,
      updateSummary: (...args) =>
        (isActive('encoding') || isActive('overlay')) &&
        diagnostics?.updateSummary(...args),
    },
    styles: {
      getCodewordStyle: (...args) =>
        overlay?.styles.getCodewordStyle(...args) ?? {
          color: '#0ea5e9',
          strokeColor: '#ffffff',
          opacity: 0.7,
        },
      getModuleContrastColor: (...args) =>
        overlay?.styles.getModuleContrastColor(...args) ?? '#ffffff',
    },
    masks: {
      ensure: (...args) => isActive('mask') && masks?.ensure(...args),
      sync: (...args) => isActive('mask') && masks?.sync(...args),
      renderPreviews: (...args) =>
        isActive('mask') && masks?.renderPreviews(...args),
    },
    outlines: { sync: (...args) => overlay?.outlines.sync(...args) },
    renderer: {
      buildModel: (...args) => overlay?.renderer.buildModel(...args) ?? null,
      getCategory: (...args) =>
        overlay?.renderer.getCategory(...args) ?? 'data',
      moduleIsDark: (...args) =>
        overlay?.renderer.moduleIsDark(...args) ?? moduleIsDark(...args),
      drawBoundaries: (...args) => overlay?.renderer.drawBoundaries(...args),
      drawOutlines: (...args) => overlay?.renderer.drawOutlines(...args),
      drawPaths: (...args) => overlay?.renderer.drawPaths(...args),
      drawFieldStarts: (...args) => overlay?.renderer.drawFieldStarts(...args),
    },
    load(name = 'encoding') {
      if (name === 'encoding') return loadEncoding();
      if (name === 'mask') return loadMask();
      if (name === 'overlay')
        return Promise.all([loadOverlay(), loadEncoding()]);
      return Promise.resolve();
    },
  };
}
