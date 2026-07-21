export const COLOR_BLACK = '#000000';
export const COLOR_WHITE = '#ffffff';
export const COLOR_DARK = '#111827';
export const COLOR_ACCENT = '#0f766e';
export const COLOR_DEBUG_DATA = '#0ea5e9';
export const COLOR_DEBUG_MASK_EFFECT = '#60a5fa';
export const COLOR_DARK_OPAQUE = '#111827ff';
export const COLOR_WHITE_OPAQUE = '#ffffffff';

const PERCENT_MAXIMUM = 100;
const RGB_CHANNEL_MAXIMUM = 255;
const HEX_RADIX = 16;
const SHORT_HEX_DIGITS = 3;
const HEX_CHANNEL_DIGITS = 2;
const RED_CHANNEL_INDEX = 0;
const GREEN_CHANNEL_INDEX = 1;
const BLUE_CHANNEL_INDEX = 2;
const LUMINANCE_RED_WEIGHT = 299;
const LUMINANCE_GREEN_WEIGHT = 587;
const LUMINANCE_BLUE_WEIGHT = 114;
const LUMINANCE_WEIGHT_TOTAL = 1000;
const DARK_TEXT_LUMINANCE_THRESHOLD = 140;

export function withAlpha(color, transparencyInput) {
  const normalizedColor = /^#[0-9a-f]{6}$/i.test(color) ? color : COLOR_BLACK;
  const transparency = Math.min(
    PERCENT_MAXIMUM,
    Math.max(0, Number.parseInt(transparencyInput.value, 10) || 0),
  );
  const alpha = Math.round(
    RGB_CHANNEL_MAXIMUM * (1 - transparency / PERCENT_MAXIMUM),
  );
  return `${normalizedColor}${alpha
    .toString(HEX_RADIX)
    .padStart(HEX_CHANNEL_DIGITS, '0')}`;
}

export function getColorAlpha(color) {
  if (color === 'transparent') return 0;
  if (/^#[0-9a-f]{8}$/i.test(color))
    return (
      Number.parseInt(color.slice(-HEX_CHANNEL_DIGITS), HEX_RADIX) /
      RGB_CHANNEL_MAXIMUM
    );
  return 1;
}

export function hexToRgba(hex, alpha) {
  const { red, green, blue } = hexToRgb(hex);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export function hexToRgb(hex) {
  const normalized = hex.replace('#', '');
  const value =
    normalized.length === SHORT_HEX_DIGITS
      ? normalized
          .split('')
          .map((part) => part + part)
          .join('')
      : normalized;

  const readChannel = (index) => {
    const start = index * HEX_CHANNEL_DIGITS;
    return Number.parseInt(
      value.slice(start, start + HEX_CHANNEL_DIGITS),
      HEX_RADIX,
    );
  };

  return {
    red: readChannel(RED_CHANNEL_INDEX),
    green: readChannel(GREEN_CHANNEL_INDEX),
    blue: readChannel(BLUE_CHANNEL_INDEX),
  };
}

export function getContrastingHex(hex) {
  const { red, green, blue } = hexToRgb(hex);
  const luminance =
    (red * LUMINANCE_RED_WEIGHT +
      green * LUMINANCE_GREEN_WEIGHT +
      blue * LUMINANCE_BLUE_WEIGHT) /
    LUMINANCE_WEIGHT_TOTAL;
  return luminance > DARK_TEXT_LUMINANCE_THRESHOLD ? COLOR_DARK : COLOR_WHITE;
}
