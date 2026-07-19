import { createMaskSelector } from '../mask-selector.js';

function moduleIsDark(qrDefinition, row, column) {
  if (typeof qrDefinition.modules.get === 'function')
    return qrDefinition.modules.get(row, column);
  return Boolean(
    qrDefinition.modules.data[row * qrDefinition.modules.size + column],
  );
}

export function createDebugMaskSetup({
  elements: e,
  config,
  encoder,
  getErrorLevel,
  getQrColors,
  render,
}) {
  const buildOptions = (value) => {
    const options = {
      errorCorrectionLevel: getErrorLevel().value,
      version: 2,
      margin: 1,
      width: 72,
      color: getQrColors(),
    };
    if (value !== '') options.maskPattern = Number.parseInt(value, 10);
    return options;
  };
  const masks = createMaskSelector({
    grid: e.maskGrid,
    input: e.maskPattern,
    values: config.maskValues,
    encoder,
    moduleIsDark,
    buildOptions,
    onChange: render,
  });
  masks.ensure();
  masks.sync();
  return masks;
}
