import { hexToRgba } from '../../colors.js';
import {
  drawFinderEyes,
  drawQrModule,
  getFinderPatternPart,
  isFinderPattern,
} from './style-drawing.js';

const DEBUG_OVERLAY_OPACITY = 0.5;

export function drawQrMatrix(state) {
  const {
    context,
    qrDefinition,
    moduleCount,
    marginModules,
    cellSize,
    debugActive,
    debugRenderer,
    debugModel,
    debugColors,
    debugUnmask,
    customEyesActive,
    customEyeColorsActive,
    imageFillActive,
    imageFillLayer,
    moduleFillStyle,
    moduleShapeOptions,
    eyeShapeOptions,
    eyeOuterFillStyle,
    eyeCenterFillStyle,
    lightColor,
    transparentLight,
    getActiveDebugOutlineMode,
    getCodewordStyle,
    getContrastColor,
  } = state;

  if (debugActive) {
    for (let row = 0; row < moduleCount; row += 1) {
      for (let column = 0; column < moduleCount; column += 1) {
        const category = debugRenderer.getCategory(
          row,
          column,
          qrDefinition,
          debugModel,
          'overlay',
        );
        context.fillStyle = hexToRgba(
          debugColors[category].value,
          DEBUG_OVERLAY_OPACITY,
        );
        context.fillRect(
          (column + marginModules) * cellSize,
          (row + marginModules) * cellSize,
          Math.ceil(cellSize),
          Math.ceil(cellSize),
        );
      }
    }
  }

  for (let row = 0; row < moduleCount; row += 1) {
    for (let column = 0; column < moduleCount; column += 1) {
      if (
        !debugRenderer.moduleIsDark(
          qrDefinition,
          row,
          column,
          debugActive,
          debugUnmask,
        )
      ) {
        continue;
      }
      if (customEyesActive && isFinderPattern(moduleCount, row, column)) {
        continue;
      }

      let fillStyle = moduleFillStyle;
      if (debugActive) {
        const category = debugRenderer.getCategory(
          row,
          column,
          qrDefinition,
          debugModel,
          'overlay',
        );
        fillStyle = hexToRgba(debugColors[category].value, 1);
      }
      if (customEyeColorsActive) {
        const eyePart = getFinderPatternPart(moduleCount, row, column);
        if (eyePart === 'outer') fillStyle = eyeOuterFillStyle;
        else if (eyePart === 'center') fillStyle = eyeCenterFillStyle;
      }
      if (imageFillActive) {
        context.fillStyle = imageFillLayer.pattern;
        drawQrModule(
          context,
          (column + marginModules) * cellSize,
          (row + marginModules) * cellSize,
          cellSize,
          moduleShapeOptions,
        );
      }
      context.fillStyle = fillStyle;
      drawQrModule(
        context,
        (column + marginModules) * cellSize,
        (row + marginModules) * cellSize,
        cellSize,
        moduleShapeOptions,
      );
    }
  }

  if (customEyesActive) {
    drawFinderEyes(
      context,
      moduleCount,
      marginModules,
      cellSize,
      eyeShapeOptions,
      eyeOuterFillStyle,
      eyeCenterFillStyle,
      lightColor,
      transparentLight,
      imageFillActive
        ? {
            pattern: imageFillLayer.pattern,
            darkFillStyle: state.darkColor,
            lightFillStyle: lightColor,
          }
        : null,
    );
  }

  if (!debugActive) return;
  debugRenderer.drawBoundaries(
    context,
    qrDefinition,
    debugModel,
    marginModules,
    cellSize,
    debugColors,
  );
  const outlineMode = getActiveDebugOutlineMode();
  debugRenderer.drawOutlines(
    context,
    debugModel,
    marginModules,
    cellSize,
    outlineMode,
    getCodewordStyle,
  );
  debugRenderer.drawPaths(
    context,
    qrDefinition,
    debugModel,
    marginModules,
    cellSize,
    outlineMode,
    getContrastColor,
  );
  debugRenderer.drawFieldStarts(
    context,
    debugModel,
    marginModules,
    cellSize,
    outlineMode,
    debugColors,
  );
}
