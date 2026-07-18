const readInteger = (input, fallback) => {
  const value = Number.parseInt(input.value, 10);
  return Number.isNaN(value) ? fallback : value;
};

export function createLazyStyleSetup(options) {
  const { elements: e, colorWithTransparency } = options;
  let controller = null;
  let request = null;
  const ensure = () => {
    if (controller) return Promise.resolve(controller);
    if (!request) {
      request = import('./setup.js')
        .then(({ createStyleSetup }) => {
          controller = createStyleSetup(options);
          return controller;
        })
        .catch((error) => {
          request = null;
          throw error;
        });
    }
    return request;
  };
  return {
    load: (name) => ensure().then((system) => system.load(name)),
    modules: {
      sync: () => controller?.modules.sync(),
      getOptions: () =>
        controller?.modules.getOptions() ?? {
          type: e.moduleShape.value,
          rounding: readInteger(e.moduleRounding, 25),
          inset: readInteger(e.moduleInset, 4),
          rotation: readInteger(e.moduleRotation, 0),
        },
    },
    eyes: {
      sync: () => controller?.eyes.sync(),
      getOptions: () =>
        controller?.eyes.getOptions() ?? {
          type: e.eyeShape.value,
          outerRounding: readInteger(e.eyeOuterRounding, 20),
          centerRounding: readInteger(e.eyeCenterRounding, 35),
        },
    },
    colors: {
      sync: () => controller?.colors.sync(),
      formatTransparency: () => controller?.colors.formatTransparency(),
      applyRecommendedImageContrast: () =>
        controller?.colors.applyRecommendedImageContrast(),
      getGradientOptions: () =>
        controller?.colors.getGradientOptions() ?? {
          type: e.gradientType.value,
          angle: readInteger(e.gradientAngle, 0),
          endColor: colorWithTransparency(
            e.colorGradientEnd.value.trim() || '#0f766e',
            e.colorGradientEndTransparency,
          ),
        },
    },
    artwork: {
      sync: () => controller?.artwork.sync(),
      syncEmoji: () => controller?.artwork.syncEmoji(),
    },
    pixelEditor: {
      initialize() {},
      syncPalette: () => controller?.pixelEditor.syncPalette(),
      syncSizeLabel: () => controller?.pixelEditor.syncSizeLabel(),
      getState: () =>
        controller?.pixelEditor.getState() ?? {
          size: readInteger(e.pixelArtSizeInput, 16),
          pixels: Array(readInteger(e.pixelArtSizeInput, 16) ** 2).fill(null),
        },
    },
    imageFill: { getImage: () => controller?.imageFill.getImage() ?? null },
    centerLogo: { getImage: () => controller?.centerLogo.getImage() ?? null },
  };
}
