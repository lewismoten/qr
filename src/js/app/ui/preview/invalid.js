import { lookup } from '../../../i18n/index.js';

export function createInvalidPreviewRenderer({
  canvas,
  encoder,
  drawQr,
  clearCanvas,
}) {
  const drawOverlay = (message) => {
    const context = canvas.getContext('2d');
    const { width, height } = canvas;
    const bannerHeight = Math.max(56, height * 0.18);
    context.fillStyle = 'rgba(255, 255, 255, 0.64)';
    context.fillRect(0, 0, width, height);
    context.fillStyle = 'rgba(153, 27, 27, 0.92)';
    context.fillRect(0, (height - bannerHeight) / 2, width, bannerHeight);
    context.fillStyle = '#ffffff';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = `800 ${Math.max(18, width * 0.07)}px "Avenir Next", "Segoe UI", sans-serif`;
    context.fillText(
      lookup('preview.invalid', 'Invalid'),
      width / 2,
      height / 2 - 8,
    );
    if (message) {
      context.font = `600 ${Math.max(10, width * 0.027)}px "Avenir Next", "Segoe UI", sans-serif`;
      context.fillText(message.slice(0, 80), width / 2, height / 2 + 16);
    }
  };

  return function renderInvalid(previewText, options, message) {
    const previewOptions = options
      ? { ...options }
      : {
          errorCorrectionLevel: 'M',
          margin: 1,
          scale: 4,
          color: { dark: '#111827', light: '#ffffff' },
        };
    delete previewOptions.version;
    try {
      const definition = encoder.create(
        previewText?.trim() ||
          lookup('preview.invalidPayload', 'Invalid preview'),
        previewOptions,
      );
      drawQr(definition, previewOptions);
    } catch {
      clearCanvas();
    }
    drawOverlay(message);
  };
}
