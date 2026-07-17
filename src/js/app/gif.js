import { pushUint16LE, textBytes } from './bytes.js';
import { encodeGifLzw } from './compression/lzw.js';

export function createGifBlob(sourceCanvas) {
  const context = sourceCanvas.getContext('2d');
  const pixels = context.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height).data;
  const indexes = new Uint8Array(sourceCanvas.width * sourceCanvas.height);
  const levels = [0, 51, 102, 153, 204, 255];
  const palette = new Uint8Array(256 * 3);
  for (let r = 0; r < 6; r += 1) {
    for (let g = 0; g < 6; g += 1) {
      for (let b = 0; b < 6; b += 1) {
        const index = 1 + r * 36 + g * 6 + b;
        palette[index * 3] = levels[r];
        palette[index * 3 + 1] = levels[g];
        palette[index * 3 + 2] = levels[b];
      }
    }
  }
  for (let index = 0; index < indexes.length; index += 1) {
    const pixel = index * 4;
    if (pixels[pixel + 3] < 128) {
      indexes[index] = 0;
      continue;
    }
    const r = Math.round(pixels[pixel] / 51);
    const g = Math.round(pixels[pixel + 1] / 51);
    const b = Math.round(pixels[pixel + 2] / 51);
    indexes[index] = 1 + r * 36 + g * 6 + b;
  }

  const packed = encodeGifLzw(indexes);

  const bytes = [...textBytes('GIF89a')];
  pushUint16LE(bytes, sourceCanvas.width);
  pushUint16LE(bytes, sourceCanvas.height);
  bytes.push(0xf7, 0, 0, ...palette, 0x21, 0xf9, 4, 1, 0, 0, 0, 0, 0x2c);
  pushUint16LE(bytes, 0);
  pushUint16LE(bytes, 0);
  pushUint16LE(bytes, sourceCanvas.width);
  pushUint16LE(bytes, sourceCanvas.height);
  bytes.push(0, 8);
  for (let offset = 0; offset < packed.length; offset += 255) {
    const block = packed.slice(offset, offset + 255);
    bytes.push(block.length, ...block);
  }
  bytes.push(0, 0x3b);
  return new Blob([new Uint8Array(bytes)], { type: 'image/gif' });
}

export function cloneCanvas(sourceCanvas) {
  const copy = document.createElement('canvas');
  copy.width = sourceCanvas.width;
  copy.height = sourceCanvas.height;
  copy.getContext('2d').drawImage(sourceCanvas, 0, 0);
  return copy;
}

export function createAnimationStage(frames) {
  const stage = document.createElement('canvas');
  stage.width = Math.max(...frames.map((frame) => frame.width));
  stage.height = Math.max(...frames.map((frame) => frame.height));
  return stage;
}

export function drawAnimationStageFrame(stage, frame, flatten = false) {
  const context = stage.getContext('2d');
  context.clearRect(0, 0, stage.width, stage.height);
  if (flatten) {
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, stage.width, stage.height);
  }
  context.drawImage(frame, (stage.width - frame.width) / 2, (stage.height - frame.height) / 2);
}

function getGifPaletteAndIndexes(stage) {
  const levels = [0, 51, 102, 153, 204, 255];
  const palette = new Uint8Array(256 * 3);
  for (let red = 0; red < 6; red += 1) {
    for (let green = 0; green < 6; green += 1) {
      for (let blue = 0; blue < 6; blue += 1) {
        const index = 1 + red * 36 + green * 6 + blue;
        palette[index * 3] = levels[red];
        palette[index * 3 + 1] = levels[green];
        palette[index * 3 + 2] = levels[blue];
      }
    }
  }

  const pixels = stage.getContext('2d').getImageData(0, 0, stage.width, stage.height).data;
  const indexes = new Uint8Array(stage.width * stage.height);
  for (let index = 0; index < indexes.length; index += 1) {
    const pixel = index * 4;
    if (pixels[pixel + 3] < 128) {
      indexes[index] = 0;
      continue;
    }
    const red = Math.round(pixels[pixel] / 51);
    const green = Math.round(pixels[pixel + 1] / 51);
    const blue = Math.round(pixels[pixel + 2] / 51);
    indexes[index] = 1 + red * 36 + green * 6 + blue;
  }
  return { palette, indexes };
}

export function createAnimatedGifBlob(frames, frameDurationMs) {
  const stage = createAnimationStage(frames);
  drawAnimationStageFrame(stage, frames[0]);
  const { palette } = getGifPaletteAndIndexes(stage);
  const delay = Math.max(1, Math.min(65535, Math.round(frameDurationMs / 10)));
  const bytes = [...textBytes('GIF89a')];
  pushUint16LE(bytes, stage.width);
  pushUint16LE(bytes, stage.height);
  bytes.push(0xf7, 0, 0, ...palette, 0x21, 0xff, 0x0b, ...textBytes('NETSCAPE2.0'), 3, 1, 0, 0, 0);

  frames.forEach((frame) => {
    drawAnimationStageFrame(stage, frame);
    const { indexes } = getGifPaletteAndIndexes(stage);
    const packed = encodeGifLzw(indexes);
    bytes.push(0x21, 0xf9, 4, 9);
    pushUint16LE(bytes, delay);
    bytes.push(0, 0, 0x2c);
    pushUint16LE(bytes, 0);
    pushUint16LE(bytes, 0);
    pushUint16LE(bytes, stage.width);
    pushUint16LE(bytes, stage.height);
    bytes.push(0, 8);
    for (let offset = 0; offset < packed.length; offset += 255) {
      const block = packed.slice(offset, offset + 255);
      bytes.push(block.length, ...block);
    }
    bytes.push(0);
  });
  bytes.push(0x3b);
  return new Blob([new Uint8Array(bytes)], { type: 'image/gif' });
}
