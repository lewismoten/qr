export function createModuleShapeSection({ shape, controls, rounding, roundingValue, inset, insetValue, rotation, rotationValue }) {
  const sync = () => {
    controls.hidden = shape.value !== 'custom';
    roundingValue.textContent = `${rounding.value}%`;
    insetValue.textContent = `${inset.value}%`;
    rotationValue.textContent = `${rotation.value} degrees`;
  };

  const getOptions = () => ({
    type: shape.value,
    rounding: Number.isNaN(Number.parseInt(rounding.value, 10)) ? 25 : Number.parseInt(rounding.value, 10),
    inset: Number.isNaN(Number.parseInt(inset.value, 10)) ? 4 : Number.parseInt(inset.value, 10),
    rotation: Number.parseInt(rotation.value, 10) || 0,
  });

  return { sync, getOptions };
}
