import { COLOR_DEBUG_DATA, COLOR_WHITE } from '../../../colors.js';
import { loadFeatureStylesheet } from '../../../../stylesheets.js';

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
        import('./debug-encoding-setup.js'),
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
        options.elements.maskGrid =
          options.document.getElementById('mask-grid');
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
      validateMode: (...args) => diagnostics?.validateMode(...args) ?? true,
      updateSummary: (...args) =>
        (isActive('encoding') || isActive('overlay')) &&
        diagnostics?.updateSummary(...args),
    },
    styles: {
      getCodewordStyle: (...args) =>
        overlay?.styles.getCodewordStyle(...args) ?? {
          color: COLOR_DEBUG_DATA,
          strokeColor: COLOR_WHITE,
          opacity: 0.7,
        },
      getContrastColor: (...args) =>
        overlay?.styles.getContrastColor(...args) ?? COLOR_WHITE,
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
