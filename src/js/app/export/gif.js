import { pushUint16LE, textBytes } from '../bytes.js';
import { encodeGifLzw } from '../compression/lzw.js';
import { throwIfAborted, waitFor } from '../abort.js';

const RGB_CHANNEL_COUNT = 3;
const RGBA_CHANNEL_COUNT = 4;
const ALPHA_CHANNEL_INDEX = 3;
const COLOR_LEVEL_COUNT = 6;
const COLOR_LEVEL_STEP = 51;
const COLOR_LEVELS = Array.from(
  { length: COLOR_LEVEL_COUNT },
  (_, level) => level * COLOR_LEVEL_STEP,
);
const COLOR_TABLE_SIZE = 256;
const FIRST_OPAQUE_COLOR = 1;
const RED_COLOR_STRIDE = COLOR_LEVEL_COUNT ** 2;
const ALPHA_OPAQUE_THRESHOLD = 128;
const GIF_PACKED_COLOR_TABLE = 0xf7;
const GIF_EXTENSION = 0x21;
const GIF_GRAPHICS_CONTROL = 0xf9;
const GIF_APPLICATION_EXTENSION = 0xff;
const GIF_IMAGE_DESCRIPTOR = 0x2c;
const GIF_TRAILER = 0x3b;
const GIF_GRAPHICS_BLOCK_SIZE = 4;
const GIF_APPLICATION_BLOCK_SIZE = 0x0b;
const GIF_LOOP_BLOCK_SIZE = 3;
const GIF_LZW_MINIMUM_CODE_SIZE = 8;
const GIF_DATA_BLOCK_LIMIT = 255;
const GIF_DELAY_LIMIT = 65535;
const MILLISECONDS_PER_GIF_DELAY = 10;
const ANIMATED_GRAPHICS_FLAGS = 9;
const CENTER_DIVISOR = 2;

function getGifPaletteAndIndexes(stage, context) {
  const palette = new Uint8Array(COLOR_TABLE_SIZE * RGB_CHANNEL_COUNT);
  for (let red = 0; red < COLOR_LEVEL_COUNT; red += 1) {
    for (let green = 0; green < COLOR_LEVEL_COUNT; green += 1) {
      for (let blue = 0; blue < COLOR_LEVEL_COUNT; blue += 1) {
        const index =
          FIRST_OPAQUE_COLOR +
          red * RED_COLOR_STRIDE +
          green * COLOR_LEVEL_COUNT +
          blue;
        palette[index * RGB_CHANNEL_COUNT] = COLOR_LEVELS[red];
        palette[index * RGB_CHANNEL_COUNT + 1] = COLOR_LEVELS[green];
        palette[index * RGB_CHANNEL_COUNT + 2] = COLOR_LEVELS[blue];
      }
    }
  }

  const pixels = context.getImageData(0, 0, stage.width, stage.height).data;
  const indexes = new Uint8Array(stage.width * stage.height);
  for (let index = 0; index < indexes.length; index += 1) {
    const pixel = index * RGBA_CHANNEL_COUNT;
    if (pixels[pixel + ALPHA_CHANNEL_INDEX] < ALPHA_OPAQUE_THRESHOLD) {
      indexes[index] = 0;
      continue;
    }
    const red = Math.round(pixels[pixel] / COLOR_LEVEL_STEP);
    const green = Math.round(pixels[pixel + 1] / COLOR_LEVEL_STEP);
    const blue = Math.round(pixels[pixel + 2] / COLOR_LEVEL_STEP);
    indexes[index] =
      FIRST_OPAQUE_COLOR +
      red * RED_COLOR_STRIDE +
      green * COLOR_LEVEL_COUNT +
      blue;
  }
  return { palette, indexes };
}

export function createGifBlob(sourceCanvas) {
  const context = sourceCanvas.getContext('2d');
  const { palette, indexes } = getGifPaletteAndIndexes(sourceCanvas, context);

  const packed = encodeGifLzw(indexes);

  const bytes = [...textBytes('GIF89a')];
  pushUint16LE(bytes, sourceCanvas.width);
  pushUint16LE(bytes, sourceCanvas.height);
  bytes.push(
    GIF_PACKED_COLOR_TABLE,
    0,
    0,
    ...palette,
    GIF_EXTENSION,
    GIF_GRAPHICS_CONTROL,
    GIF_GRAPHICS_BLOCK_SIZE,
    1,
    0,
    0,
    0,
    0,
    GIF_IMAGE_DESCRIPTOR,
  );
  pushUint16LE(bytes, 0);
  pushUint16LE(bytes, 0);
  pushUint16LE(bytes, sourceCanvas.width);
  pushUint16LE(bytes, sourceCanvas.height);
  bytes.push(0, GIF_LZW_MINIMUM_CODE_SIZE);
  for (let offset = 0; offset < packed.length; offset += GIF_DATA_BLOCK_LIMIT) {
    const block = packed.slice(offset, offset + GIF_DATA_BLOCK_LIMIT);
    bytes.push(block.length, ...block);
  }
  bytes.push(0, GIF_TRAILER);
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

export function drawAnimationStageFrame(
  stage,
  frame,
  flatten = false,
  context = stage.getContext('2d'),
) {
  context.clearRect(0, 0, stage.width, stage.height);
  if (flatten) {
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, stage.width, stage.height);
  }
  context.drawImage(
    frame,
    (stage.width - frame.width) / CENTER_DIVISOR,
    (stage.height - frame.height) / CENTER_DIVISOR,
  );
}

export async function createAnimatedGifBlob(
  frames,
  frameDurationMs,
  { onProgress, signal } = {},
) {
  throwIfAborted(signal);
  const stage = createAnimationStage(frames);
  const context = stage.getContext('2d', { willReadFrequently: true });
  drawAnimationStageFrame(stage, frames[0], false, context);
  const { palette } = getGifPaletteAndIndexes(stage, context);
  const delay = Math.max(
    1,
    Math.min(
      GIF_DELAY_LIMIT,
      Math.round(frameDurationMs / MILLISECONDS_PER_GIF_DELAY),
    ),
  );
  const bytes = [...textBytes('GIF89a')];
  pushUint16LE(bytes, stage.width);
  pushUint16LE(bytes, stage.height);
  bytes.push(
    GIF_PACKED_COLOR_TABLE,
    0,
    0,
    ...palette,
    GIF_EXTENSION,
    GIF_APPLICATION_EXTENSION,
    GIF_APPLICATION_BLOCK_SIZE,
    ...textBytes('NETSCAPE2.0'),
    GIF_LOOP_BLOCK_SIZE,
    1,
    0,
    0,
    0,
  );

  for (let frameIndex = 0; frameIndex < frames.length; frameIndex += 1) {
    throwIfAborted(signal);
    const frame = frames[frameIndex];
    drawAnimationStageFrame(stage, frame, false, context);
    const { indexes } = getGifPaletteAndIndexes(stage, context);
    const packed = encodeGifLzw(indexes);
    bytes.push(
      GIF_EXTENSION,
      GIF_GRAPHICS_CONTROL,
      GIF_GRAPHICS_BLOCK_SIZE,
      ANIMATED_GRAPHICS_FLAGS,
    );
    pushUint16LE(bytes, delay);
    bytes.push(0, 0, GIF_IMAGE_DESCRIPTOR);
    pushUint16LE(bytes, 0);
    pushUint16LE(bytes, 0);
    pushUint16LE(bytes, stage.width);
    pushUint16LE(bytes, stage.height);
    bytes.push(0, GIF_LZW_MINIMUM_CODE_SIZE);
    for (
      let offset = 0;
      offset < packed.length;
      offset += GIF_DATA_BLOCK_LIMIT
    ) {
      const block = packed.slice(offset, offset + GIF_DATA_BLOCK_LIMIT);
      bytes.push(block.length, ...block);
    }
    bytes.push(0);
    onProgress?.(frameIndex + 1, frames.length);
    await waitFor(0, signal);
  }
  bytes.push(GIF_TRAILER);
  return new Blob([new Uint8Array(bytes)], { type: 'image/gif' });
}
