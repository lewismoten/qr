import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getFallbackEyeOptions,
  getFallbackModuleOptions,
  getFallbackPixelArtState,
  readStyleInteger,
  STYLE_DEFAULTS,
  STYLE_LIMITS,
} from '../../src/js/app/ui/style/style-values.js';

test('style values use inputs when valid and documented defaults otherwise', () => {
  assert.equal(readStyleInteger({ value: '12px' }, 4), 12);
  assert.equal(readStyleInteger({ value: 'invalid' }, 4), 4);
  assert.equal(readStyleInteger(null, 7), 7);
  assert.deepEqual(getFallbackModuleOptions({}), {
    type: 'square',
    rounding: STYLE_DEFAULTS.module.rounding,
    inset: STYLE_DEFAULTS.module.inset,
    rotation: STYLE_DEFAULTS.module.rotation,
  });
  assert.deepEqual(
    getFallbackModuleOptions({
      moduleShape: { value: 'dots' },
      moduleRounding: { value: '40' },
      moduleInset: { value: '6' },
      moduleRotation: { value: '-15' },
    }),
    { type: 'dots', rounding: 40, inset: 6, rotation: -15 },
  );
  assert.deepEqual(getFallbackEyeOptions({}), {
    type: 'default',
    outerRounding: STYLE_DEFAULTS.eye.outerRounding,
    centerRounding: STYLE_DEFAULTS.eye.centerRounding,
  });
  assert.deepEqual(
    getFallbackEyeOptions({
      eyeShape: { value: 'rounded' },
      eyeOuterRounding: { value: '30' },
      centerRounding: { value: '45' },
    }),
    { type: 'rounded', outerRounding: 30, centerRounding: 45 },
  );
});

test('pixel-art fallback creates an independent empty square canvas', () => {
  const fallback = getFallbackPixelArtState({});
  assert.equal(fallback.size, STYLE_DEFAULTS.pixelArt.size);
  assert.equal(fallback.pixels.length, fallback.size ** 2);
  assert.ok(fallback.pixels.every((pixel) => pixel === null));
  assert.deepEqual(
    getFallbackPixelArtState({ pixelSizeInput: { value: '8' } }),
    {
      size: STYLE_LIMITS.pixelArt.minimumSize,
      pixels: Array(STYLE_LIMITS.pixelArt.minimumSize ** 2).fill(null),
    },
  );
});
