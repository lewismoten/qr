export function createLazyStyleSetup(options) {
  let controller = null;
  let featureElements = null;
  let request = null;
  const ensure = () => {
    if (controller) return Promise.resolve(controller);
    if (!request) {
      request = Promise.all([import('./setup.js'), import('./elements.js')])
        .then(([{ createStyleSetup }, { getStyleElements }]) => {
          featureElements = getStyleElements(options.document);
          controller = createStyleSetup({
            ...options,
            elements: featureElements,
          });
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
          type: 'square',
          rounding: 25,
          inset: 4,
          rotation: 0,
        },
    },
    eyes: {
      sync: () => controller?.eyes.sync(),
      getOptions: () =>
        controller?.eyes.getOptions() ?? {
          type: 'default',
          outerRounding: 20,
          centerRounding: 35,
        },
    },
    colors: {
      sync: () => controller?.colors.sync(),
      formatTransparency: () => controller?.colors.formatTransparency(),
      applyRecommendedImageContrast: () =>
        controller?.colors.applyRecommendedImageContrast(),
      getGradientOptions: () =>
        controller?.colors.getGradientOptions() ?? {
          type: 'solid',
          angle: 0,
          endColor: '#0f766e',
        },
      getQrColors: () => ({
        dark: featureElements
          ? options.colorWithTransparency(
              featureElements.colorDark.value.trim() || '#111827',
              featureElements.colorDarkTransparency,
            )
          : '#111827ff',
        light: featureElements
          ? options.colorWithTransparency(
              featureElements.colorLight.value.trim() || '#ffffff',
              featureElements.colorLightTransparency,
            )
          : '#ffffffff',
      }),
    },
    artwork: {
      sync: () => controller?.artwork.sync(),
      syncEmoji: () => controller?.artwork.syncEmoji(),
      getOptions: () => ({
        mode: featureElements?.centerArtMode.value ?? 'none',
        emoji: featureElements?.centerEmoji.value.trim() ?? '',
        sizePercent: featureElements
          ? Number.parseInt(featureElements.centerArtSize.value, 10) || 20
          : 20,
        protectBackground: featureElements?.centerArtBackground.checked ?? true,
        matchModuleShape:
          featureElements?.pixelArtMatchModuleShape.checked ?? false,
      }),
    },
    pixelEditor: {
      initialize() {},
      syncPalette: () => controller?.pixelEditor.syncPalette(),
      syncSizeLabel: () => controller?.pixelEditor.syncSizeLabel(),
      getState: () =>
        controller?.pixelEditor.getState() ?? {
          size: 16,
          pixels: Array(256).fill(null),
        },
    },
    imageFill: { getImage: () => controller?.imageFill.getImage() ?? null },
    centerLogo: { getImage: () => controller?.centerLogo.getImage() ?? null },
    getEyeColors: () => ({
      enabled: featureElements?.eyeCustomColorsEnabled.checked ?? false,
      outer: featureElements?.eyeOuterColor.value ?? '#0f766e',
      center: featureElements?.eyeCenterColor.value ?? '#111827',
    }),
  };
}
