import { lookup } from '../../../../i18n/index.js';
import { STYLE_DEFAULTS } from '../style-values.js';

export function createEyeShapeSection({
  shape,
  controls,
  outerRounding,
  outerRoundingValue,
  centerRounding,
  centerRoundingValue,
  customColorsEnabled,
  colorControls,
  isImageFill,
}) {
  const sync = () => {
    const imageFill = isImageFill();
    controls.hidden = shape.value !== 'custom';
    customColorsEnabled.disabled = imageFill;
    colorControls.hidden = imageFill || !customColorsEnabled.checked;
    outerRoundingValue.textContent = lookup('units.percent', '{value}%', {
      value: outerRounding.value,
    });
    centerRoundingValue.textContent = lookup('units.percent', '{value}%', {
      value: centerRounding.value,
    });
  };

  const getOptions = () => ({
    type: shape.value,
    outerRounding: Number.isNaN(Number.parseInt(outerRounding.value, 10))
      ? STYLE_DEFAULTS.eye.outerRounding
      : Number.parseInt(outerRounding.value, 10),
    centerRounding: Number.isNaN(Number.parseInt(centerRounding.value, 10))
      ? STYLE_DEFAULTS.eye.centerRounding
      : Number.parseInt(centerRounding.value, 10),
  });

  return { sync, getOptions };
}
