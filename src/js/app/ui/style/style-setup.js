import {
  installArtworkDrawing,
  installShapeDrawing,
} from '../preview/style-drawing.js';
import { COLOR_ACCENT } from '../../colors.js';
import { loadFeatureStylesheet } from '../../../stylesheets.js';
import {
  getFallbackEyeOptions,
  getFallbackModuleOptions,
  getFallbackPixelArtState,
  isImageFillSelected,
  readStyleInteger,
} from './style-values.js';

export function createStyleSetup({
  document,
  elements: e,
  render,
  withAlpha,
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
        controls: e.moduleControls,
        rounding: e.moduleRounding,
        roundingValue: e.roundingValue,
        inset: e.moduleInset,
        insetValue: e.moduleInsetValue,
        rotation: e.moduleRotation,
        rotationValue: e.rotationValue,
      });
      const eyes = createEyeShapeSection({
        shape: e.eyeShape,
        controls: e.eyeControls,
        outerRounding: e.eyeOuterRounding,
        outerRoundValue: e.outerRoundValue,
        centerRounding: e.centerRounding,
        centerRoundValue: e.centerRoundValue,
        customEyeColors: e.customEyeColors,
        colorControls: e.eyeColorControls,
        isImageFill: () => isImageFillSelected(e.gradientType),
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
        darkTransparency: e.darkAlpha,
        darkAlphaValue: e.darkAlphaValue,
        lightAlpha: e.lightAlpha,
        lightAlphaValue: e.lightAlphaValue,
        gradientType: e.gradientType,
        gradientControls: e.gradientControls,
        angleControls: e.angleControls,
        gradientAngle: e.gradientAngle,
        angleValue: e.angleValue,
        gradientEndColor: e.colorGradientEnd,
        endAlpha: e.endAlpha,
        endAlphaValue: e.endAlphaValue,
        imageControls: e.imageControls,
        imageFillClear: e.imageFillClear,
        hasImageFill: () => Boolean(imageFill?.getImage()),
        withAlpha,
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
      e.imageRecommend.addEventListener('click', () => {
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
          sizeInput: e.pixelSizeInput,
          sizeValue: e.pixelSizeValue,
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
          controls: e.artControls,
          logoControls: e.logoControls,
          emojiControls: e.emojiControls,
          pixelControls: e.pixelControls,
          size: e.centerArtSize,
          sizeValue: e.artSizeValue,
          background: e.artBackground,
          backgroundLabel: e.artBgLabel,
          outlineControls: e.outlineControls,
          outlineThickness: e.outlineThickness,
          outlineValue: e.outlineValue,
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
      e.artBackground.addEventListener('input', artwork.syncOutline);
      e.outlineThickness.addEventListener('input', artwork.syncOutline);
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
      modulesSystem?.modules.getOptions() ?? getFallbackModuleOptions(e),
  };
  const eyes = {
    sync: () => modulesSystem?.eyes.sync(),
    getOptions: () =>
      modulesSystem?.eyes.getOptions() ?? getFallbackEyeOptions(e),
  };
  const colors = {
    sync: () => colorsSystem?.colors.sync(),
    formatTransparency: () => colorsSystem?.colors.formatTransparency(),
    applyRecommendedImageContrast: () =>
      colorsSystem?.colors.applyRecommendedImageContrast(),
    getGradientOptions: () =>
      colorsSystem?.colors.getGradientOptions() ?? {
        type: e.gradientType?.value ?? 'solid',
        angle: readStyleInteger(e.gradientAngle, 0),
        endColor: e.colorGradientEnd
          ? withAlpha(
              e.colorGradientEnd.value.trim() || COLOR_ACCENT,
              e.endAlpha,
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
      artworkSystem?.pixelEditor.getState() ?? getFallbackPixelArtState(e),
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
