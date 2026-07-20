import {
  installArtworkDrawing,
  installShapeDrawing,
} from '../preview/style-drawing.js';
import { COLOR_ACCENT } from '../../colors.js';
import { loadFeatureStylesheet } from '../../../stylesheets.js';

const readInteger = (input, fallback) => {
  const value = Number.parseInt(input?.value, 10);
  return Number.isNaN(value) ? fallback : value;
};

export function createStyleSetup({
  document,
  elements: e,
  render,
  colorWithTransparency,
  setFrameCentered,
}) {
  let modulesSystem = null;
  let colorsSystem = null;
  let artworkSystem = null;
  const requests = new Map();

  const syncChoice = (target, value) => {
    if (target === e.gradientType) colors.sync();
    if (target === e.moduleShape) modules.sync();
    if (target === e.eyeShape) eyes.sync();
    if (target === e.centerArtMode) {
      if (value !== 'none') setFrameCentered(false);
      artwork.sync();
    }
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

  const loadModules = () =>
    loadOnce('modules', async () => {
      const [
        ,
        { createModuleShapeSection },
        { createEyeShapeSection },
        shapeDrawing,
      ] = await Promise.all([
        loadFeatureStylesheet('style-modules'),
        import('./modules/module-style-section.js'),
        import('./eyes/eye-style-section.js'),
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
        ,
        { createColorSection },
        { createImageInputController },
        shapeDrawing,
      ] = await Promise.all([
        loadFeatureStylesheet('style-colors'),
        import('./colors/color-style-section.js'),
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
      e.imageFillRecommended.addEventListener('click', () => {
        colors.applyRecommendedImageContrast();
        render();
      });
      colors.formatTransparency();
      colors.sync();
    });

  const loadArtwork = () =>
    loadOnce('artwork', async () => {
      const [
        ,
        { createArtworkControls },
        { createImageInputController },
        { createLazyPixelArtEditor },
        artworkDrawing,
        shapeDrawing,
      ] = await Promise.all([
        loadFeatureStylesheet('style-artwork'),
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
          background: e.centerArtBackground,
          backgroundLabel: e.centerArtBackgroundLabel,
          outlineControls: e.centerArtOutlineControls,
          outlineThickness: e.centerArtOutlineThickness,
          outlineThicknessValue: e.centerArtOutlineThicknessValue,
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
      const frameCenter = document.getElementById('frame-message-center-art');
      e.centerArtBackground.addEventListener('input', artwork.syncOutline);
      e.centerArtOutlineThickness.addEventListener(
        'input',
        artwork.syncOutline,
      );
      frameCenter.addEventListener('input', () => {
        setFrameCentered(frameCenter.checked);
        render();
      });
      e.emojiOptions.forEach((button) =>
        button.addEventListener('click', () => {
          e.centerEmoji.value = button.dataset.emoji || '';
          artwork.syncEmoji();
          render();
        }),
      );
      pixelEditor.initialize();
      artwork.sync();
    });

  const modules = {
    sync: () => modulesSystem?.modules.sync(),
    getOptions: () =>
      modulesSystem?.modules.getOptions() ?? {
        type: e.moduleShape?.value ?? 'square',
        rounding: readInteger(e.moduleRounding, 25),
        inset: readInteger(e.moduleInset, 4),
        rotation: readInteger(e.moduleRotation, 0),
      },
  };
  const eyes = {
    sync: () => modulesSystem?.eyes.sync(),
    getOptions: () =>
      modulesSystem?.eyes.getOptions() ?? {
        type: e.eyeShape?.value ?? 'default',
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
        type: e.gradientType?.value ?? 'solid',
        angle: readInteger(e.gradientAngle, 0),
        endColor: e.colorGradientEnd
          ? colorWithTransparency(
              e.colorGradientEnd.value.trim() || COLOR_ACCENT,
              e.colorGradientEndTransparency,
            )
          : COLOR_ACCENT,
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

  document.getElementById('qr-form').addEventListener('click', (event) => {
    const button = event.target.closest('.choice-button');
    if (!button) return;
    const target = document.getElementById(button.dataset.choiceTarget);
    if (target) syncChoice(target, button.dataset.choiceValue);
  });

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
