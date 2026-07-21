import { COLOR_ACCENT, COLOR_BLACK, COLOR_WHITE } from '../../../colors.js';
import { lookup } from '../../../../i18n/index.js';

export function createColorSection({
  darkColor,
  lightColor,
  darkTransparency,
  darkAlphaValue,
  lightAlpha,
  lightAlphaValue,
  gradientType,
  gradientControls,
  angleControls,
  gradientAngle,
  angleValue,
  gradientEndColor,
  endAlpha,
  endAlphaValue,
  imageControls,
  imageFillClear,
  hasImageFill,
  withAlpha,
}) {
  const formatTransparency = () => {
    darkAlphaValue.textContent = lookup('units.percent', '{value}%', {
      value: darkTransparency.value,
    });
    lightAlphaValue.textContent = lookup('units.percent', '{value}%', {
      value: lightAlpha.value,
    });
    endAlphaValue.textContent = lookup('units.percent', '{value}%', {
      value: endAlpha.value,
    });
  };

  const sync = () => {
    const isGradient =
      gradientType.value === 'linear' || gradientType.value === 'radial';
    gradientControls.hidden = !isGradient;
    angleControls.hidden = gradientType.value !== 'linear';
    imageControls.hidden = gradientType.value !== 'image';
    imageFillClear.disabled = !hasImageFill();
    angleValue.textContent = lookup('units.degrees', '{value} degrees', {
      value: gradientAngle.value,
    });
  };

  const getGradientOptions = () => ({
    type: gradientType.value,
    angle: Number.parseInt(gradientAngle.value, 10) || 0,
    endColor: withAlpha(
      gradientEndColor.value.trim() || COLOR_ACCENT,
      endAlpha,
    ),
  });

  const applyRecommendedImageContrast = () => {
    darkColor.value = COLOR_BLACK;
    darkTransparency.value = '75';
    lightColor.value = COLOR_WHITE;
    lightAlpha.value = '25';
    formatTransparency();
  };

  return {
    formatTransparency,
    sync,
    getGradientOptions,
    applyRecommendedImageContrast,
  };
}
