import { COLOR_ACCENT, COLOR_BLACK, COLOR_WHITE } from '../../../colors.js';
import { lookup } from '../../../../i18n/index.js';

export function createColorSection({
  darkColor,
  lightColor,
  darkTransparency,
  darkTransparencyValue,
  lightTransparency,
  lightTransparencyValue,
  gradientType,
  gradientControls,
  gradientAngleControls,
  gradientAngle,
  gradientAngleValue,
  gradientEndColor,
  gradientEndTransparency,
  gradientEndTransparencyValue,
  imageFillControls,
  imageFillClear,
  hasImageFill,
  colorWithTransparency,
}) {
  const formatTransparency = () => {
    darkTransparencyValue.textContent = lookup('units.percent', '{value}%', {
      value: darkTransparency.value,
    });
    lightTransparencyValue.textContent = lookup('units.percent', '{value}%', {
      value: lightTransparency.value,
    });
    gradientEndTransparencyValue.textContent = lookup(
      'units.percent',
      '{value}%',
      { value: gradientEndTransparency.value },
    );
  };

  const sync = () => {
    const isGradient =
      gradientType.value === 'linear' || gradientType.value === 'radial';
    gradientControls.hidden = !isGradient;
    gradientAngleControls.hidden = gradientType.value !== 'linear';
    imageFillControls.hidden = gradientType.value !== 'image';
    imageFillClear.disabled = !hasImageFill();
    gradientAngleValue.textContent = lookup(
      'units.degrees',
      '{value} degrees',
      { value: gradientAngle.value },
    );
  };

  const getGradientOptions = () => ({
    type: gradientType.value,
    angle: Number.parseInt(gradientAngle.value, 10) || 0,
    endColor: colorWithTransparency(
      gradientEndColor.value.trim() || COLOR_ACCENT,
      gradientEndTransparency,
    ),
  });

  const applyRecommendedImageContrast = () => {
    darkColor.value = COLOR_BLACK;
    darkTransparency.value = '75';
    lightColor.value = COLOR_WHITE;
    lightTransparency.value = '25';
    formatTransparency();
  };

  return {
    formatTransparency,
    sync,
    getGradientOptions,
    applyRecommendedImageContrast,
  };
}
