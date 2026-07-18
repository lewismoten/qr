import { getOpaqueArtworkBackground } from '../../../frame-text.js';
import { drawQrModule, fillEyeShape } from '../drawing/shapes.js';
import { getPixelArtLayout } from './pixel-layout.js';

function drawOutlinedEmoji(
  context,
  emoji,
  center,
  artSize,
  outlineColor,
  outlinePercent = 25,
) {
  const outlineWidth = Math.max(1.5, artSize * (outlinePercent / 400));
  const bufferSize = Math.ceil(artSize + outlineWidth * 6);
  const emojiCanvas = document.createElement('canvas');
  const maskCanvas = document.createElement('canvas');
  emojiCanvas.width = bufferSize;
  emojiCanvas.height = bufferSize;
  maskCanvas.width = bufferSize;
  maskCanvas.height = bufferSize;
  const emojiContext = emojiCanvas.getContext('2d');
  const maskContext = maskCanvas.getContext('2d');
  if (!emojiContext || !maskContext) return;
  let fontSize = artSize * 0.82;
  const family = '"Apple Color Emoji", "Segoe UI Emoji", sans-serif';
  emojiContext.font = `${fontSize}px ${family}`;
  const measuredWidth = emojiContext.measureText(emoji).width;
  if (measuredWidth > artSize * 0.92)
    fontSize *= (artSize * 0.92) / measuredWidth;
  emojiContext.font = `${fontSize}px ${family}`;
  emojiContext.textAlign = 'center';
  emojiContext.textBaseline = 'middle';
  emojiContext.fillText(
    emoji,
    bufferSize / 2,
    bufferSize / 2 + fontSize * 0.04,
  );
  maskContext.drawImage(emojiCanvas, 0, 0);
  maskContext.globalCompositeOperation = 'source-in';
  maskContext.fillStyle = outlineColor;
  maskContext.fillRect(0, 0, bufferSize, bufferSize);
  const target = center - bufferSize / 2;
  for (let step = 0; step < 24; step += 1) {
    const angle = (step / 24) * Math.PI * 2;
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
  const badgeSize = qrSize * (options.sizePercent / 100);
  const center = qrStart + qrSize / 2;
  const artPadding = options.protectBackground ? badgeSize * 0.13 : 0;
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
      20,
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
      context.font = `${artSize * 0.82}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(options.emoji, center, center + artSize * 0.04);
    }
  } else drawPixelArt(context, center, artSize, options);
  context.restore();
}
