import { lookup } from '../../../i18n/index.js';

export function createQrConfiguration({
  elements: e,
  encoder,
  helpers,
  alphanumericCharacters,
}) {
  const buildOptions = () => {
    const base = {
      errorCorrectionLevel: helpers.getErrorLevel().value,
      margin: helpers.readInteger(e.qrMargin) ?? 1,
      scale: helpers.readInteger(e.qrScale) ?? 4,
      color: {
        ...helpers.getQrColors(),
      },
    };
    if (!e.qrWidthAuto.checked)
      base.width = helpers.readInteger(e.qrWidth) ?? 320;
    const chunked =
      e.qrFormat.value === 'file' && helpers.getFileMode() === 'chunked';
    const version = chunked
      ? helpers.getChunkVersion()
      : e.versionAuto.checked
        ? undefined
        : helpers.readInteger(e.qrVersion);
    if (version !== undefined) base.version = version;
    const mask = helpers.readInteger(e.maskPattern);
    if (mask !== undefined) base.maskPattern = mask;
    const options = base;
    if (chunked) options.version = helpers.getChunkVersion();
    return options;
  };

  const buildPayload = (text) => {
    const chunked =
      e.qrFormat.value === 'file' && helpers.getFileMode() === 'chunked';
    if (chunked && text.trim()) return [{ data: text, mode: 'byte' }];
    if (e.qrFormat.value === 'number' && e.modeAuto.checked && text.trim()) {
      const mode = /^\d+$/.test(text)
        ? 'numeric'
        : [...text].every((character) =>
              alphanumericCharacters.includes(character),
            )
          ? 'alphanumeric'
          : 'byte';
      return [{ data: text, mode }];
    }
    const mode = helpers.getEncodingMode();
    return mode && text.trim() ? [{ data: text, mode }] : text;
  };

  const createDefinition = (payload, options) => {
    if (typeof encoder?.create !== 'function')
      throw new Error(
        lookup(
          'preview.encoderError',
          'The first-party QR encoder did not load.',
        ),
      );
    return encoder.create(payload, options);
  };

  return { buildOptions, buildPayload, createDefinition };
}
