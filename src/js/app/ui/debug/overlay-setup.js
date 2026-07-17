import { getContrastingHex } from '../../colors.js';
import {
  drawCodewordOutlines,
  drawHighlightedBoundaries,
} from './boundaries.js';
import { getDebugColorElements } from './colors.js';
import {
  buildDebugOverlayModel,
  getDebugCategory,
  moduleIsDarkForPreview,
} from './model.js';
import { createOutlineSelector } from './outline.js';
import { drawCodewordPaths, drawStreamFieldStarts } from './paths.js';
import { createDebugStyles } from './styles.js';

export function createDebugOverlaySetup({
  elements: e,
  colorElements,
  runtime,
}) {
  Object.assign(colorElements, getDebugColorElements(document));
  const styles = createDebugStyles({
    colors: colorElements,
    getContrastingHex,
    getCategory: getDebugCategory,
  });
  const outlines = createOutlineSelector({
    buttons: e.debugOutlineModeButtons,
    defaultValue: runtime.getOutlineMode(),
    onChange(value) {
      runtime.setOutlineMode(value);
      runtime.render();
    },
  });
  outlines.sync();
  return {
    styles,
    outlines,
    renderer: {
      buildModel: buildDebugOverlayModel,
      getCategory: getDebugCategory,
      moduleIsDark: moduleIsDarkForPreview,
      drawBoundaries: drawHighlightedBoundaries,
      drawOutlines: drawCodewordOutlines,
      drawPaths: drawCodewordPaths,
      drawFieldStarts: drawStreamFieldStarts,
    },
  };
}
