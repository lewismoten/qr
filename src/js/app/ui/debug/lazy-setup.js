function moduleIsDark(qrDefinition, row, column) {
  if (typeof qrDefinition.modules.get === 'function') return qrDefinition.modules.get(row, column);
  return Boolean(qrDefinition.modules.data[row * qrDefinition.modules.size + column]);
}

export function createLazyDebugSetup(options) {
  let implementation = null;
  let loading = null;
  const call = (group, method, fallback) => (...args) => {
    const handler = implementation?.[group]?.[method];
    return handler ? handler(...args) : fallback?.(...args);
  };
  const facade = {
    diagnostics: {
      setValidation: call('diagnostics', 'setValidation'),
      validateManualMode: call('diagnostics', 'validateManualMode', () => true),
      updateSummary: call('diagnostics', 'updateSummary'),
    },
    styles: {
      getCodewordStyle: call('styles', 'getCodewordStyle', () => ({
        color: '#0ea5e9', strokeColor: '#ffffff', opacity: 0.7,
      })),
      getModuleContrastColor: call('styles', 'getModuleContrastColor', () => '#ffffff'),
    },
    masks: {
      ensure: call('masks', 'ensure'),
      sync: call('masks', 'sync'),
      renderPreviews: call('masks', 'renderPreviews'),
    },
    outlines: { sync: call('outlines', 'sync') },
    renderer: {
      buildModel: call('renderer', 'buildModel', () => null),
      getCategory: call('renderer', 'getCategory', () => 'data'),
      moduleIsDark: call('renderer', 'moduleIsDark', moduleIsDark),
      drawBoundaries: call('renderer', 'drawBoundaries'),
      drawOutlines: call('renderer', 'drawOutlines'),
      drawPaths: call('renderer', 'drawPaths'),
      drawFieldStarts: call('renderer', 'drawFieldStarts'),
    },
    load() {
      if (implementation) return Promise.resolve(implementation);
      if (!loading) {
        loading = import('./runtime.js').then(({ createDebugRuntime }) => {
          implementation = createDebugRuntime(options);
          implementation.outlines.sync();
          implementation.masks.ensure();
          implementation.masks.sync();
          return implementation;
        });
      }
      return loading;
    },
  };
  return facade;
}
