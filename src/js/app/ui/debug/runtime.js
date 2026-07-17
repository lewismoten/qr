import { drawCodewordOutlines, drawHighlightedBoundaries } from './boundaries.js';
import { createApplicationDebugSetup } from './application-setup.js';
import { buildDebugOverlayModel, getDebugCategory, moduleIsDarkForPreview } from './model.js';
import { drawCodewordPaths, drawStreamFieldStarts } from './paths.js';

export function createDebugRuntime(options) {
  return {
    ...createApplicationDebugSetup(options),
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
