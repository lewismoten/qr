import { lookup } from '../../../../i18n/index.js';

export function createModuleShapeSection({ shape, controls, rounding, roundingValue, inset, insetValue, rotation, rotationValue }) {
  const sync = () => {
    controls.hidden = shape.value !== 'custom';
    roundingValue.textContent = lookup('units.percent', '{value}%', { value: rounding.value });
    insetValue.textContent = lookup('units.percent', '{value}%', { value: inset.value });
    rotationValue.textContent = lookup('units.degrees', '{value} degrees', { value: rotation.value });
  };

  const getOptions = () => ({
    type: shape.value,
    rounding: Number.isNaN(Number.parseInt(rounding.value, 10)) ? 25 : Number.parseInt(rounding.value, 10),
    inset: Number.isNaN(Number.parseInt(inset.value, 10)) ? 4 : Number.parseInt(inset.value, 10),
    rotation: Number.parseInt(rotation.value, 10) || 0,
  });

  return { sync, getOptions };
}
