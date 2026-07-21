import { STYLE_DEFAULTS, STYLE_LIMITS } from '../style-values.js';

export function getModuleGeometry(options = {}) {
  if (options.type === 'rounded') {
    return { inset: 0, rounding: 32, rotation: 0 };
  }
  if (options.type === 'dots') return { inset: 8, rounding: 50, rotation: 0 };
  if (options.type === 'diamond') {
    return { inset: 15, rounding: 0, rotation: 45 };
  }
  if (options.type !== 'custom') return null;
  return {
    inset: Math.min(
      STYLE_LIMITS.module.maximumInset,
      Math.max(0, options.inset ?? STYLE_DEFAULTS.module.inset),
    ),
    rounding: Math.min(
      STYLE_LIMITS.module.maximumRounding,
      Math.max(0, options.rounding ?? STYLE_DEFAULTS.module.rounding),
    ),
    rotation: Math.min(
      STYLE_LIMITS.module.maximumRotation,
      Math.max(
        -STYLE_LIMITS.module.maximumRotation,
        options.rotation ?? STYLE_DEFAULTS.module.rotation,
      ),
    ),
  };
}

export function getEyeGeometry(options) {
  if (options.type === 'square') return { outerRounding: 0, centerRounding: 0 };
  if (options.type === 'rounded') {
    return { outerRounding: 18, centerRounding: 32 };
  }
  if (options.type === 'circle') {
    return { outerRounding: 50, centerRounding: 50 };
  }
  if (options.type !== 'custom') return null;
  return {
    outerRounding: Math.min(
      STYLE_LIMITS.module.maximumRounding,
      Math.max(0, options.outerRounding ?? STYLE_DEFAULTS.eye.outerRounding),
    ),
    centerRounding: Math.min(
      STYLE_LIMITS.module.maximumRounding,
      Math.max(0, options.centerRounding ?? STYLE_DEFAULTS.eye.centerRounding),
    ),
  };
}
