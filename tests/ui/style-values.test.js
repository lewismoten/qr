import assert from 'node:assert/strict';
import test from 'node:test';

import {
  COLOR_ACCENT,
  COLOR_BLACK,
  COLOR_WHITE,
} from '../../src/js/app/colors.js';
import { createColorSection } from '../../src/js/app/ui/style/colors/color-style-section.js';
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

test('image fills disable custom eye colors in the colors section', () => {
  const control = (value = '') => ({ value, hidden: false, disabled: false });
  const gradientType = control('image');
  const customEyeColors = { checked: true, disabled: false };
  const eyeColorControls = { hidden: false };
  const fields = {
    darkColor: control('#000000'),
    lightColor: control('#ffffff'),
    darkTransparency: control('0'),
    darkAlphaValue: control(),
    lightAlpha: control('0'),
    lightAlphaValue: control(),
    gradientControls: control(),
    angleControls: control(),
    gradientAngle: control('0'),
    angleValue: control(),
    gradientEndColor: control('#000000'),
    endAlpha: control('0'),
    endAlphaValue: control(),
    imageControls: control(),
    imageFillClear: control(),
  };
  const {
    angleControls,
    angleValue,
    darkAlphaValue,
    darkColor,
    darkTransparency,
    endAlpha,
    endAlphaValue,
    gradientAngle,
    gradientControls,
    gradientEndColor,
    imageControls,
    imageFillClear,
    lightAlpha,
    lightAlphaValue,
    lightColor,
  } = fields;
  let hasImage = false;
  const colors = createColorSection({
    ...fields,
    gradientType,
    customEyeColors,
    eyeColorControls,
    hasImageFill: () => hasImage,
    withAlpha: (value, alpha) => `${value}:${alpha.value}`,
  });

  colors.sync();
  assert.equal(customEyeColors.disabled, true);
  assert.equal(eyeColorControls.hidden, true);
  gradientEndColor.value = '';
  assert.equal(colors.getGradientOptions().angle, 0);
  assert.equal(colors.getGradientOptions().endColor, `${COLOR_ACCENT}:0`);

  gradientType.value = 'linear';
  gradientAngle.value = '45';
  gradientEndColor.value = '#123456';
  hasImage = true;
  colors.sync();
  assert.equal(customEyeColors.disabled, false);
  assert.equal(eyeColorControls.hidden, false);
  assert.equal(gradientControls.hidden, false);
  assert.equal(angleControls.hidden, false);
  assert.equal(imageControls.hidden, true);
  assert.equal(imageFillClear.disabled, false);
  assert.equal(angleValue.textContent, '45 degrees');
  assert.deepEqual(colors.getGradientOptions(), {
    type: 'linear',
    angle: 45,
    endColor: '#123456:0',
  });

  gradientType.value = 'radial';
  customEyeColors.checked = false;
  colors.sync();
  assert.equal(angleControls.hidden, true);
  assert.equal(eyeColorControls.hidden, true);

  darkTransparency.value = '60';
  lightAlpha.value = '15';
  endAlpha.value = '30';
  colors.formatTransparency();
  assert.equal(darkAlphaValue.textContent, '60%');
  assert.equal(lightAlphaValue.textContent, '15%');
  assert.equal(endAlphaValue.textContent, '30%');

  colors.applyRecommendedImageContrast();
  assert.equal(darkColor.value, COLOR_BLACK);
  assert.equal(darkTransparency.value, '75');
  assert.equal(lightColor.value, COLOR_WHITE);
  assert.equal(lightAlpha.value, '25');
  assert.equal(darkAlphaValue.textContent, '75%');
  assert.equal(lightAlphaValue.textContent, '25%');
});
