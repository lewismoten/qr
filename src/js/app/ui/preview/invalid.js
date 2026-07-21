import { COLOR_DARK, COLOR_WHITE } from '../../colors.js';
import { lookup } from '../../../i18n/index.js';

const MINIMUM_BANNER_HEIGHT_PX = 56;
const BANNER_HEIGHT_RATIO = 0.18;
const MINIMUM_TITLE_FONT_PX = 18;
const TITLE_FONT_RATIO = 0.07;
const TITLE_VERTICAL_OFFSET_PX = 8;
const MINIMUM_MESSAGE_FONT_PX = 10;
const MESSAGE_FONT_RATIO = 0.027;
const MAXIMUM_MESSAGE_CHARACTERS = 80;
const MESSAGE_VERTICAL_OFFSET_PX = 16;
const INVALID_PREVIEW_COLORS = Object.freeze({
  veil: 'rgba(255, 255, 255, 0.64)',
  banner: 'rgba(153, 27, 27, 0.92)',
});

export function createInvalidPreviewRenderer({
  canvas,
  encoder,
  drawQr,
  clearCanvas,
}) {
  const drawOverlay = (message) => {
    const context = canvas.getContext('2d');
    const { width, height } = canvas;
    const bannerHeight = Math.max(
      MINIMUM_BANNER_HEIGHT_PX,
      height * BANNER_HEIGHT_RATIO,
    );
    context.fillStyle = INVALID_PREVIEW_COLORS.veil;
    context.fillRect(0, 0, width, height);
    context.fillStyle = INVALID_PREVIEW_COLORS.banner;
    context.fillRect(0, (height - bannerHeight) / 2, width, bannerHeight);
    context.fillStyle = COLOR_WHITE;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font =
      `800 ${Math.max(MINIMUM_TITLE_FONT_PX, width * TITLE_FONT_RATIO)}px ` +
      '"Avenir Next", "Segoe UI", sans-serif';
    context.fillText(
      lookup('preview.invalid', 'Invalid'),
      width / 2,
      height / 2 - TITLE_VERTICAL_OFFSET_PX,
    );
    if (message) {
      context.font =
        `600 ${Math.max(
          MINIMUM_MESSAGE_FONT_PX,
          width * MESSAGE_FONT_RATIO,
        )}px ` + '"Avenir Next", "Segoe UI", sans-serif';
      context.fillText(
        message.slice(0, MAXIMUM_MESSAGE_CHARACTERS),
        width / 2,
        height / 2 + MESSAGE_VERTICAL_OFFSET_PX,
      );
    }
  };

  return function renderInvalid(previewText, options, message) {
    const previewOptions = options
      ? { ...options }
      : {
          errorCorrectionLevel: 'M',
          margin: 1,
          scale: 4,
          color: { dark: COLOR_DARK, light: COLOR_WHITE },
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
