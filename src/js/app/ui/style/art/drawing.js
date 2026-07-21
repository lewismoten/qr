import { getOpaqueArtworkBackground } from '../../../data/frame-text.js';
import { drawQrModule, fillEyeShape } from '../drawing/shapes.js';
import { getPixelArtLayout } from './pixel-layout.js';
import { STYLE_DEFAULTS, STYLE_PERCENT_SCALE } from '../style-values.js';

const EMOJI_DRAWING_STYLE = {
  minOutlineWidth: 1.5,
  outlineDivisor: 400,
  bufferMultiplier: 6,
  initialFontScale: 0.82,
  maxWidthScale: 0.92,
  baselineScale: 0.04,
  outlineSteps: 24,
};
const ARTWORK_STYLE = {
  paddingScale: 0.13,
  badgeRounding: 20,
};

function drawOutlinedEmoji(
  context,
  emoji,
  center,
  artSize,
  outlineColor,
  outlinePercent = STYLE_DEFAULTS.artwork.outlinePercent,
) {
  const outlineWidth = Math.max(
    EMOJI_DRAWING_STYLE.minOutlineWidth,
    artSize * (outlinePercent / EMOJI_DRAWING_STYLE.outlineDivisor),
  );
  const bufferSize = Math.ceil(
    artSize + outlineWidth * EMOJI_DRAWING_STYLE.bufferMultiplier,
  );
  const emojiCanvas = document.createElement('canvas');
  const maskCanvas = document.createElement('canvas');
  emojiCanvas.width = bufferSize;
  emojiCanvas.height = bufferSize;
  maskCanvas.width = bufferSize;
  maskCanvas.height = bufferSize;
  const emojiContext = emojiCanvas.getContext('2d');
  const maskContext = maskCanvas.getContext('2d');
  if (!emojiContext || !maskContext) return;
  let fontSize = artSize * EMOJI_DRAWING_STYLE.initialFontScale;
  const family = '"Apple Color Emoji", "Segoe UI Emoji", sans-serif';
  emojiContext.font = `${fontSize}px ${family}`;
  const measuredWidth = emojiContext.measureText(emoji).width;
  if (measuredWidth > artSize * EMOJI_DRAWING_STYLE.maxWidthScale) {
    fontSize *= (artSize * EMOJI_DRAWING_STYLE.maxWidthScale) / measuredWidth;
  }
  emojiContext.font = `${fontSize}px ${family}`;
  emojiContext.textAlign = 'center';
  emojiContext.textBaseline = 'middle';
  emojiContext.fillText(
    emoji,
    bufferSize / 2,
    bufferSize / 2 + fontSize * EMOJI_DRAWING_STYLE.baselineScale,
  );
  maskContext.drawImage(emojiCanvas, 0, 0);
  maskContext.globalCompositeOperation = 'source-in';
  maskContext.fillStyle = outlineColor;
  maskContext.fillRect(0, 0, bufferSize, bufferSize);
  const target = center - bufferSize / 2;
  for (let step = 0; step < EMOJI_DRAWING_STYLE.outlineSteps; step += 1) {
    const angle = (step / EMOJI_DRAWING_STYLE.outlineSteps) * Math.PI * 2;
    context.drawImage(
      maskCanvas,
      target + Math.cos(angle) * outlineWidth,
      target + Math.sin(angle) * outlineWidth,
    );
  }
  context.drawImage(emojiCanvas, target, target);
}

function getPixelBounds(artX, artY, pixelSize, row, column) {
  const left = Math.round(artX + column * pixelSize);
  const top = Math.round(artY + row * pixelSize);
  const right = Math.round(artX + (column + 1) * pixelSize);
  const bottom = Math.round(artY + (row + 1) * pixelSize);
  return { left, top, right, bottom };
}

function drawPixelShape(context, geometry, options, expansion = 0) {
  const { artX, artY, pixelSize, row, column } = geometry;
  if (options.matchModuleShape) {
    drawQrModule(
      context,
      artX + column * pixelSize - expansion,
      artY + row * pixelSize - expansion,
      pixelSize + expansion * 2,
      options.moduleShape,
    );
    return;
  }
  const bounds = getPixelBounds(artX, artY, pixelSize, row, column);
  context.fillRect(
    bounds.left - expansion,
    bounds.top - expansion,
    bounds.right - bounds.left + expansion * 2,
    bounds.bottom - bounds.top + expansion * 2,
  );
}

function drawPixelArt(context, center, artSize, options) {
  const layout = getPixelArtLayout(
    center,
    artSize,
    options.pixelArt,
    options.outlinePercent,
  );

  context.imageSmoothingEnabled = false;
  if (options.protectBackground) {
    context.fillStyle = getOpaqueArtworkBackground(options.lightColor);
    layout.pixels.forEach((pixel) => {
      drawPixelShape(context, pixel, options, layout.outline);
    });
  }
  layout.pixels.forEach((pixel) => {
    context.fillStyle = pixel.color;
    drawPixelShape(context, pixel, options);
  });
}

export function drawCenterArtwork(context, qrStart, qrSize, options) {
  const hasArtwork =
    (options.mode === 'logo' && options.logo) ||
    (options.mode === 'emoji' && options.emoji) ||
    (options.mode === 'pixel' && options.pixelArt.pixels.some(Boolean));
  if (!hasArtwork) return;
  const badgeSize = qrSize * (options.sizePercent / STYLE_PERCENT_SCALE);
  const center = qrStart + qrSize / 2;
  const artPadding = options.protectBackground
    ? badgeSize * ARTWORK_STYLE.paddingScale
    : 0;
  const artSize = badgeSize - artPadding * 2;
  context.save();
  if (
    options.protectBackground &&
    options.mode !== 'emoji' &&
    options.mode !== 'pixel'
  ) {
    fillEyeShape(
      context,
      center - badgeSize / 2,
      center - badgeSize / 2,
      badgeSize,
      ARTWORK_STYLE.badgeRounding,
      getOpaqueArtworkBackground(options.lightColor),
    );
  }
  if (options.mode === 'logo') {
    const scale = Math.min(
      artSize / options.logo.naturalWidth,
      artSize / options.logo.naturalHeight,
    );
    const width = options.logo.naturalWidth * scale;
    const height = options.logo.naturalHeight * scale;
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(
      options.logo,
      center - width / 2,
      center - height / 2,
      width,
      height,
    );
  } else if (options.mode === 'emoji') {
    if (options.protectBackground) {
      drawOutlinedEmoji(
        context,
        options.emoji,
        center,
        artSize,
        getOpaqueArtworkBackground(options.lightColor),
        options.outlinePercent,
      );
    } else {
      context.font = `${artSize * EMOJI_DRAWING_STYLE.initialFontScale}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(
        options.emoji,
        center,
        center + artSize * EMOJI_DRAWING_STYLE.baselineScale,
      );
    }
  } else drawPixelArt(context, center, artSize, options);
  context.restore();
}
