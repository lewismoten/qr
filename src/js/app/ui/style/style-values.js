export const STYLE_PERCENT_SCALE = 100;
export const HALF_TURN_DEGREES = 180;

export const STYLE_DEFAULTS = Object.freeze({
  module: Object.freeze({ inset: 4, rounding: 25, rotation: 0 }),
  eye: Object.freeze({ outerRounding: 20, centerRounding: 35 }),
  artwork: Object.freeze({ sizePercent: 20, outlinePercent: 25 }),
  pixelArt: Object.freeze({ size: 16 }),
});

export const STYLE_LIMITS = Object.freeze({
  module: Object.freeze({
    maximumInset: 30,
    maximumRounding: 50,
    maximumRotation: 45,
  }),
  pixelArt: Object.freeze({ minimumSize: 8, maximumSize: 32, sizeStep: 2 }),
});

export function readStyleInteger(input, fallback) {
  const value = Number.parseInt(input?.value, 10);
  return Number.isNaN(value) ? fallback : value;
}

export function isImageFillSelected(gradientType) {
  return gradientType?.value === 'image';
}

export function getFallbackModuleOptions(elements) {
  return {
    type: elements.moduleShape?.value ?? 'square',
    rounding: readStyleInteger(
      elements.moduleRounding,
      STYLE_DEFAULTS.module.rounding,
    ),
    inset: readStyleInteger(elements.moduleInset, STYLE_DEFAULTS.module.inset),
    rotation: readStyleInteger(
      elements.moduleRotation,
      STYLE_DEFAULTS.module.rotation,
    ),
  };
}

export function getFallbackEyeOptions(elements) {
  return {
    type: elements.eyeShape?.value ?? 'default',
    outerRounding: readStyleInteger(
      elements.eyeOuterRounding,
      STYLE_DEFAULTS.eye.outerRounding,
    ),
    centerRounding: readStyleInteger(
      elements.centerRounding,
      STYLE_DEFAULTS.eye.centerRounding,
    ),
  };
}

export function getFallbackPixelArtState(elements) {
  const size = readStyleInteger(
    elements.pixelSizeInput,
    STYLE_DEFAULTS.pixelArt.size,
  );
  return { size, pixels: Array(size * size).fill(null) };
}
