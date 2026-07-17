import {
  installArtworkDrawing,
  installShapeDrawing,
} from '../preview/style-drawing.js';

const readInteger = (input, fallback) => {
  const value = Number.parseInt(input.value, 10);
  return Number.isNaN(value) ? fallback : value;
};

export function createStyleSetup({
  elements: e,
  render,
  colorWithTransparency,
}) {
  let modulesSystem = null;
  let colorsSystem = null;
  let artworkSystem = null;
  const requests = new Map();

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

  const loadModules = () =>
    loadOnce('modules', async () => {
      const [
        { createModuleShapeSection },
        { createEyeShapeSection },
        shapeDrawing,
      ] = await Promise.all([
        import('./modules/section.js'),
        import('./eyes/section.js'),
        import('./drawing/shapes.js'),
      ]);
      installShapeDrawing(shapeDrawing);
      const modules = createModuleShapeSection({
        shape: e.moduleShape,
        controls: e.moduleCustomControls,
        rounding: e.moduleRounding,
        roundingValue: e.moduleRoundingValue,
        inset: e.moduleInset,
        insetValue: e.moduleInsetValue,
        rotation: e.moduleRotation,
        rotationValue: e.moduleRotationValue,
      });
      const eyes = createEyeShapeSection({
        shape: e.eyeShape,
        controls: e.eyeCustomControls,
        outerRounding: e.eyeOuterRounding,
        outerRoundingValue: e.eyeOuterRoundingValue,
        centerRounding: e.eyeCenterRounding,
        centerRoundingValue: e.eyeCenterRoundingValue,
        customColorsEnabled: e.eyeCustomColorsEnabled,
        colorControls: e.eyeColorControls,
        isImageFill: () => e.gradientType.value === 'image',
      });
      modulesSystem = { modules, eyes };
      modules.sync();
      eyes.sync();
    });

  const loadColors = () =>
    loadOnce('colors', async () => {
      const [
        { createColorSection },
        { createImageInputController },
        shapeDrawing,
      ] = await Promise.all([
        import('./colors/section.js'),
        import('./art/image-input.js'),
        import('./drawing/shapes.js'),
      ]);
      installShapeDrawing(shapeDrawing);
      let imageFill = null;
      const colors = createColorSection({
        darkColor: e.colorDark,
        lightColor: e.colorLight,
        darkTransparency: e.colorDarkTransparency,
        darkTransparencyValue: e.colorDarkTransparencyValue,
        lightTransparency: e.colorLightTransparency,
        lightTransparencyValue: e.colorLightTransparencyValue,
        gradientType: e.gradientType,
        gradientControls: e.gradientControls,
        gradientAngleControls: e.gradientAngleControls,
        gradientAngle: e.gradientAngle,
        gradientAngleValue: e.gradientAngleValue,
        gradientEndColor: e.colorGradientEnd,
        gradientEndTransparency: e.colorGradientEndTransparency,
        gradientEndTransparencyValue: e.colorGradientEndTransparencyValue,
        imageFillControls: e.imageFillControls,
        imageFillClear: e.imageFillClear,
        hasImageFill: () => Boolean(imageFill?.getImage()),
        colorWithTransparency,
      });
      imageFill = createImageInputController({
        input: e.imageFillInput,
        clearButton: e.imageFillClear,
        onUpdate(image) {
          if (image) colors.applyRecommendedImageContrast();
          colors.sync();
          render();
        },
      });
      colorsSystem = { colors, imageFill };
      colors.formatTransparency();
      colors.sync();
    });

  const loadArtwork = () =>
    loadOnce('artwork', async () => {
      const [
        { createArtworkControls },
        { createImageInputController },
        { createLazyPixelArtEditor },
        artworkDrawing,
        shapeDrawing,
      ] = await Promise.all([
        import('./art/controls.js'),
        import('./art/image-input.js'),
        import('./art/lazy-pixel-editor.js'),
        import('./art/drawing.js'),
        import('./drawing/shapes.js'),
      ]);
      installShapeDrawing(shapeDrawing);
      installArtworkDrawing(artworkDrawing);
      const pixelEditor = createLazyPixelArtEditor(
        {
          paletteElement: e.pixelArtPalette,
          customColorInput: e.pixelArtColor,
          clearButton: e.pixelArtClear,
          grid: e.pixelArtGrid,
          sizeInput: e.pixelArtSizeInput,
          sizeValue: e.pixelArtSizeValue,
          onChange: render,
        },
        {
          isActive: () => e.centerArtMode.value === 'pixel',
          onReady: render,
        },
      );
      const artwork = createArtworkControls({
        elements: {
          mode: e.centerArtMode,
          controls: e.centerArtControls,
          logoControls: e.centerLogoControls,
          emojiControls: e.centerEmojiControls,
          pixelControls: e.centerPixelControls,
          size: e.centerArtSize,
          sizeValue: e.centerArtSizeValue,
          backgroundLabel: e.centerArtBackgroundLabel,
          emoji: e.centerEmoji,
          emojiOptions: e.emojiOptions,
        },
        pixelEditor,
      });
      const centerLogo = createImageInputController({
        input: e.centerLogoInput,
        clearButton: e.centerLogoClear,
        onUpdate: render,
      });
      artworkSystem = { artwork, centerLogo, pixelEditor };
      pixelEditor.initialize();
      artwork.sync();
    });

  const modules = {
    sync: () => modulesSystem?.modules.sync(),
    getOptions: () =>
      modulesSystem?.modules.getOptions() ?? {
        type: e.moduleShape.value,
        rounding: readInteger(e.moduleRounding, 25),
        inset: readInteger(e.moduleInset, 4),
        rotation: readInteger(e.moduleRotation, 0),
      },
  };
  const eyes = {
    sync: () => modulesSystem?.eyes.sync(),
    getOptions: () =>
      modulesSystem?.eyes.getOptions() ?? {
        type: e.eyeShape.value,
        outerRounding: readInteger(e.eyeOuterRounding, 20),
        centerRounding: readInteger(e.eyeCenterRounding, 35),
      },
  };
  const colors = {
    sync: () => colorsSystem?.colors.sync(),
    formatTransparency: () => colorsSystem?.colors.formatTransparency(),
    applyRecommendedImageContrast: () =>
      colorsSystem?.colors.applyRecommendedImageContrast(),
    getGradientOptions: () =>
      colorsSystem?.colors.getGradientOptions() ?? {
        type: e.gradientType.value,
        angle: readInteger(e.gradientAngle, 0),
        endColor: colorWithTransparency(
          e.colorGradientEnd.value.trim() || '#0f766e',
          e.colorGradientEndTransparency,
        ),
      },
  };
  const artwork = {
    sync: () => artworkSystem?.artwork.sync(),
    syncEmoji: () => artworkSystem?.artwork.syncEmoji(),
  };
  const pixelEditor = {
    initialize: () => {},
    syncPalette: () => artworkSystem?.pixelEditor.syncPalette(),
    syncSizeLabel: () => artworkSystem?.pixelEditor.syncSizeLabel(),
    getState: () =>
      artworkSystem?.pixelEditor.getState() ??
      (() => {
        const size = readInteger(e.pixelArtSizeInput, 16);
        return { size, pixels: Array(size * size).fill(null) };
      })(),
  };

  const load = async (name) => {
    if (name === 'modules') await loadModules();
    if (name === 'colors') await loadColors();
    if (name === 'artwork') await loadArtwork();
  };

  return {
    load,
    modules,
    eyes,
    colors,
    artwork,
    pixelEditor,
    imageFill: { getImage: () => colorsSystem?.imageFill.getImage() ?? null },
    centerLogo: {
      getImage: () => artworkSystem?.centerLogo.getImage() ?? null,
    },
  };
}
