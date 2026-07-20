export function fitCanvasText(context, text, maximumWidth) {
  let low = 0;
  let high = text.length + 1;
  while (low + 1 < high) {
    const middle = Math.floor((low + high) / 2);
    if (
      context.measureText(`${text.slice(0, middle).trimEnd()}...`).width <=
      maximumWidth
    )
      low = middle;
    else high = middle;
  }
  const fitted = text.slice(0, low).trimEnd();
  return fitted ? `${fitted}...` : '...';
}

export function wrapFrameMessage(
  context,
  message,
  maximumWidth,
  maximumLines = 2,
  truncate = true,
) {
  const explicitLines = message
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  if (explicitLines.length > 1) {
    if (
      explicitLines.length <= maximumLines &&
      explicitLines.every(
        (line) => context.measureText(line).width <= maximumWidth,
      )
    ) {
      return explicitLines;
    }
    if (!truncate) {
      return null;
    }
    return explicitLines
      .slice(0, maximumLines)
      .map((line) =>
        context.measureText(line).width <= maximumWidth
          ? line
          : fitCanvasText(context, line, maximumWidth),
      );
  }

  let remaining = message.replace(/\s+/g, ' ').trim();
  const lines = [];
  const emailBreak =
    maximumLines >= 2 ? remaining.match(/^(.*?)(@[^\s@]+)$/) : null;
  if (emailBreak && emailBreak[1].trim()) {
    const emailLines = [emailBreak[1].trim(), emailBreak[2]];
    if (
      emailLines.every(
        (line) => context.measureText(line).width <= maximumWidth,
      )
    ) {
      return emailLines;
    }
    if (!truncate) {
      return null;
    }
  }

  while (remaining && lines.length < maximumLines) {
    let low = 0;
    let high = remaining.length + 1;
    while (low + 1 < high) {
      const middle = Math.floor((low + high) / 2);
      if (context.measureText(remaining.slice(0, middle)).width <= maximumWidth)
        low = middle;
      else high = middle;
    }
    let length = Math.max(1, low);

    if (length < remaining.length) {
      const wordBoundary = remaining.lastIndexOf(' ', length);
      if (wordBoundary >= Math.floor(length / 2)) {
        length = wordBoundary;
      }
    }

    const line = remaining.slice(0, length).trim();
    remaining = remaining.slice(length).trim();
    lines.push(line);
  }

  if (!remaining && lines.length === 2 && !message.trim().includes(' ')) {
    const combined = lines.join('');
    const midpoint = Math.ceil(combined.length / 2);
    lines[0] = combined.slice(0, midpoint);
    lines[1] = combined.slice(midpoint);
  }

  if (remaining && !truncate) {
    return null;
  }
  if (remaining && lines.length) {
    lines[lines.length - 1] = fitCanvasText(
      context,
      lines[lines.length - 1],
      maximumWidth,
    );
  }
  return lines;
}

export function fitFrameMessage(
  context,
  message,
  maximumWidth,
  maximumLineHeight,
  getFont,
) {
  const maximumFontSize = Math.ceil(maximumLineHeight * 2.5);
  const trySize = (fontSize) => {
    const font = getFont(fontSize);
    context.font = font;
    const metrics = context.measureText('Mg');
    const measuredHeight =
      metrics.actualBoundingBoxAscent !== undefined &&
      metrics.actualBoundingBoxDescent !== undefined
        ? metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent
        : fontSize;
    if (measuredHeight > maximumLineHeight) return null;

    const lines = wrapFrameMessage(context, message, maximumWidth, 2, false);
    if (
      lines &&
      lines.every((line) => context.measureText(line).width <= maximumWidth)
    ) {
      return { font, lines };
    }
    return null;
  };
  let low = 4;
  let high = maximumFontSize;
  let fitted = null;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const candidate = trySize(middle);
    if (candidate) {
      fitted = candidate;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  if (fitted) return fitted;

  const font = getFont(4);
  context.font = font;
  return { font, lines: wrapFrameMessage(context, message, maximumWidth) };
}

export function drawFrameMessage(
  context,
  messageLines,
  canvasSize,
  captionHeight,
  font,
  lineHeight,
  textColor,
) {
  if (!messageLines.length || captionHeight <= 0) {
    return;
  }

  context.save();
  context.fillStyle = textColor;
  context.font = font;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  const blockHeight = messageLines.length * lineHeight;
  const firstLineY =
    canvasSize + (captionHeight - blockHeight) / 2 + lineHeight / 2;
  messageLines.forEach((line, index) => {
    context.fillText(line, canvasSize / 2, firstLineY + index * lineHeight);
  });
  context.restore();
}

export function drawCenteredFrameMessage(
  context,
  messageLines,
  font,
  lineHeight,
  center,
  textColor,
  lightColor,
  cellSize,
) {
  if (!messageLines.length) {
    return;
  }

  context.save();
  context.font = font;
  context.strokeStyle = getOpaqueArtworkBackground(lightColor);
  context.lineWidth = Math.max(2, cellSize * 0.8);
  context.lineJoin = 'round';
  context.miterLimit = 2;
  context.fillStyle = textColor;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  const firstLineY = center - ((messageLines.length - 1) * lineHeight) / 2;
  messageLines.forEach((line, index) => {
    const y = firstLineY + index * lineHeight;
    context.strokeText(line, center, y);
    context.fillText(line, center, y);
  });
  context.restore();
}

export function getOpaqueArtworkBackground(lightColor) {
  return /^#[0-9a-f]{6}/i.test(lightColor)
    ? lightColor.slice(0, 7)
    : COLOR_WHITE;
}
import { COLOR_WHITE } from '../colors.js';
