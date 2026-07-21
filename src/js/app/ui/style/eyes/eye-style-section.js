import { lookup } from '../../../../i18n/index.js';
import { STYLE_DEFAULTS } from '../style-values.js';

export function createEyeShapeSection({
  shape,
  controls,
  outerRounding,
  outerRoundValue,
  centerRounding,
  centerRoundValue,
  customEyeColors,
  colorControls,
  isImageFill,
}) {
  const sync = () => {
    const imageFill = isImageFill();
    controls.hidden = shape.value !== 'custom';
    customEyeColors.disabled = imageFill;
    colorControls.hidden = imageFill || !customEyeColors.checked;
    outerRoundValue.textContent = lookup('units.percent', '{value}%', {
      value: outerRounding.value,
    });
    centerRoundValue.textContent = lookup('units.percent', '{value}%', {
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
