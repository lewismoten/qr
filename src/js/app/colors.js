export function colorWithTransparency(color, transparencyInput) {
  const normalizedColor = /^#[0-9a-f]{6}$/i.test(color) ? color : '#000000';
  const transparency = Math.min(
    100,
    Math.max(0, Number.parseInt(transparencyInput.value, 10) || 0),
  );
  const alpha = Math.round(255 * (1 - transparency / 100));
  return `${normalizedColor}${alpha.toString(16).padStart(2, '0')}`;
}

export function getColorAlpha(color) {
  if (color === 'transparent') return 0;
  if (/^#[0-9a-f]{8}$/i.test(color))
    return Number.parseInt(color.slice(7, 9), 16) / 255;
  return 1;
}

export function hexToRgba(hex, alpha) {
  const { red, green, blue } = hexToRgb(hex);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export function hexToRgb(hex) {
  const normalized = hex.replace('#', '');
  const value =
    normalized.length === 3
      ? normalized
          .split('')
          .map((part) => part + part)
          .join('')
      : normalized;

  return {
    red: Number.parseInt(value.slice(0, 2), 16),
    green: Number.parseInt(value.slice(2, 4), 16),
    blue: Number.parseInt(value.slice(4, 6), 16),
  };
}

export function getContrastingHex(hex) {
  const { red, green, blue } = hexToRgb(hex);
  const luminance = (red * 299 + green * 587 + blue * 114) / 1000;
  return luminance > 140 ? '#111827' : '#ffffff';
}
