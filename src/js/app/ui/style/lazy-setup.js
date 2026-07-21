import { STYLE_DEFAULTS } from './style-values.js';

export function createLazyStyleSetup(options) {
  let controller = null;
  let featureElements = null;
  let getElements = null;
  let request = null;
  const ensure = () => {
    if (controller) return Promise.resolve(controller);
    if (!request) {
      request = Promise.all([
        import('./style-setup.js'),
        import('./style-elements.js'),
      ])
        .then(([{ createStyleSetup }, { getStyleElements }]) => {
          getElements = getStyleElements;
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
    load: (name) =>
      ensure().then((system) => {
        Object.assign(featureElements, getElements(options.document));
        return system.load(name);
      }),
    modules: {
      sync: () => controller?.modules.sync(),
      getOptions: () =>
        controller?.modules.getOptions() ?? {
          type: 'square',
          rounding: STYLE_DEFAULTS.module.rounding,
          inset: STYLE_DEFAULTS.module.inset,
          rotation: STYLE_DEFAULTS.module.rotation,
        },
    },
    eyes: {
      sync: () => controller?.eyes.sync(),
      getOptions: () =>
        controller?.eyes.getOptions() ?? {
          type: 'default',
          outerRounding: STYLE_DEFAULTS.eye.outerRounding,
          centerRounding: STYLE_DEFAULTS.eye.centerRounding,
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
          endColor: COLOR_ACCENT,
        },
      getQrColors: () => ({
        dark: featureElements?.colorDark
          ? options.withAlpha(
              featureElements.colorDark.value.trim() || COLOR_DARK,
              featureElements.colorDarkTransparency,
            )
          : COLOR_DARK_OPAQUE,
        light: featureElements?.colorLight
          ? options.withAlpha(
              featureElements.colorLight.value.trim() || COLOR_WHITE,
              featureElements.colorLightTransparency,
            )
          : COLOR_WHITE_OPAQUE,
      }),
    },
    artwork: {
      sync: () => controller?.artwork.sync(),
      syncEmoji: () => controller?.artwork.syncEmoji(),
      getOptions: () => ({
        mode: featureElements?.centerArtMode?.value ?? 'none',
        emoji: featureElements?.centerEmoji?.value.trim() ?? '',
        sizePercent: featureElements?.centerArtSize
          ? Number.parseInt(featureElements.centerArtSize.value, 10) ||
            STYLE_DEFAULTS.artwork.sizePercent
          : STYLE_DEFAULTS.artwork.sizePercent,
        protectBackground:
          featureElements?.centerArtBackground?.checked ?? true,
        outlinePercent: featureElements?.centerArtOutlineThickness
          ? Number.parseInt(
              featureElements.centerArtOutlineThickness.value,
              10,
            ) || STYLE_DEFAULTS.artwork.outlinePercent
          : STYLE_DEFAULTS.artwork.outlinePercent,
        matchModuleShape:
          featureElements?.pixelArtMatchModuleShape?.checked ?? false,
      }),
    },
    pixelEditor: {
      initialize() {},
      syncPalette: () => controller?.pixelEditor.syncPalette(),
      syncSizeLabel: () => controller?.pixelEditor.syncSizeLabel(),
      getState: () =>
        controller?.pixelEditor.getState() ?? {
          size: STYLE_DEFAULTS.pixelArt.size,
          pixels: Array(
            STYLE_DEFAULTS.pixelArt.size * STYLE_DEFAULTS.pixelArt.size,
          ).fill(null),
        },
    },
    imageFill: { getImage: () => controller?.imageFill.getImage() ?? null },
    centerLogo: { getImage: () => controller?.centerLogo.getImage() ?? null },
    getEyeColors: () => ({
      enabled: featureElements?.eyeCustomColorsEnabled?.checked ?? false,
      outer: featureElements?.eyeOuterColor?.value ?? COLOR_ACCENT,
      center: featureElements?.eyeCenterColor?.value ?? COLOR_DARK,
    }),
  };
}
import {
  COLOR_ACCENT,
  COLOR_DARK,
  COLOR_DARK_OPAQUE,
  COLOR_WHITE,
  COLOR_WHITE_OPAQUE,
} from '../../colors.js';
