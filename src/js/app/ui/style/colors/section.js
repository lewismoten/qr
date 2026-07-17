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
    darkTransparencyValue.textContent = `${darkTransparency.value}%`;
    lightTransparencyValue.textContent = `${lightTransparency.value}%`;
    gradientEndTransparencyValue.textContent = `${gradientEndTransparency.value}%`;
  };

  const sync = () => {
    const isGradient = gradientType.value === 'linear' || gradientType.value === 'radial';
    gradientControls.hidden = !isGradient;
    gradientAngleControls.hidden = gradientType.value !== 'linear';
    imageFillControls.hidden = gradientType.value !== 'image';
    imageFillClear.disabled = !hasImageFill();
    gradientAngleValue.textContent = `${gradientAngle.value} degrees`;
  };

  const getGradientOptions = () => ({
    type: gradientType.value,
    angle: Number.parseInt(gradientAngle.value, 10) || 0,
    endColor: colorWithTransparency(
      gradientEndColor.value.trim() || '#0f766e',
      gradientEndTransparency,
    ),
  });

  const applyRecommendedImageContrast = () => {
    darkColor.value = '#000000';
    darkTransparency.value = '75';
    lightColor.value = '#ffffff';
    lightTransparency.value = '25';
    formatTransparency();
  };

  return { formatTransparency, sync, getGradientOptions, applyRecommendedImageContrast };
}
