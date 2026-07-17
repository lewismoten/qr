import { createArtworkControls } from './art/controls.js';
import { createImageInputController } from './art/image-input.js';
import { createPixelArtEditor } from './art/pixel-editor.js';
import { createColorSection } from './colors/section.js';
import { createEyeShapeSection } from './eyes/section.js';
import { createModuleShapeSection } from './modules/section.js';

export function createStyleSetup({ elements: e, render, colorWithTransparency }) {
  const pixelEditor = createPixelArtEditor({
    paletteElement: e.pixelArtPalette, customColorInput: e.pixelArtColor,
    clearButton: e.pixelArtClear, grid: e.pixelArtGrid, sizeInput: e.pixelArtSizeInput,
    sizeValue: e.pixelArtSizeValue, onChange: render,
  });
  const modules = createModuleShapeSection({
    shape: e.moduleShape, controls: e.moduleCustomControls, rounding: e.moduleRounding,
    roundingValue: e.moduleRoundingValue, inset: e.moduleInset, insetValue: e.moduleInsetValue,
    rotation: e.moduleRotation, rotationValue: e.moduleRotationValue,
  });
  const eyes = createEyeShapeSection({
    shape: e.eyeShape, controls: e.eyeCustomControls, outerRounding: e.eyeOuterRounding,
    outerRoundingValue: e.eyeOuterRoundingValue, centerRounding: e.eyeCenterRounding,
    centerRoundingValue: e.eyeCenterRoundingValue, customColorsEnabled: e.eyeCustomColorsEnabled,
    colorControls: e.eyeColorControls, isImageFill: () => e.gradientType.value === 'image',
  });
  const artwork = createArtworkControls({
    elements: { mode: e.centerArtMode, controls: e.centerArtControls,
      logoControls: e.centerLogoControls, emojiControls: e.centerEmojiControls,
      pixelControls: e.centerPixelControls, size: e.centerArtSize, sizeValue: e.centerArtSizeValue,
      backgroundLabel: e.centerArtBackgroundLabel, emoji: e.centerEmoji,
      emojiOptions: e.emojiOptions },
    pixelEditor,
  });
  let imageFill = null;
  const colors = createColorSection({
    darkColor: e.colorDark, lightColor: e.colorLight,
    darkTransparency: e.colorDarkTransparency, darkTransparencyValue: e.colorDarkTransparencyValue,
    lightTransparency: e.colorLightTransparency, lightTransparencyValue: e.colorLightTransparencyValue,
    gradientType: e.gradientType, gradientControls: e.gradientControls,
    gradientAngleControls: e.gradientAngleControls, gradientAngle: e.gradientAngle,
    gradientAngleValue: e.gradientAngleValue, gradientEndColor: e.colorGradientEnd,
    gradientEndTransparency: e.colorGradientEndTransparency,
    gradientEndTransparencyValue: e.colorGradientEndTransparencyValue,
    imageFillControls: e.imageFillControls, imageFillClear: e.imageFillClear,
    hasImageFill: () => Boolean(imageFill?.getImage()), colorWithTransparency,
  });
  imageFill = createImageInputController({
    input: e.imageFillInput, clearButton: e.imageFillClear,
    onUpdate(image) {
      if (image) colors.applyRecommendedImageContrast();
      colors.sync();
      render();
    },
  });
  const centerLogo = createImageInputController({
    input: e.centerLogoInput, clearButton: e.centerLogoClear, onUpdate: render,
  });
  return { pixelEditor, modules, eyes, artwork, colors, imageFill, centerLogo };
}
