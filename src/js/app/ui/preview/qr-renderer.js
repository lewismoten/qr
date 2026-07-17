import { getColorAlpha } from '../../colors.js';
import {
  drawCenteredFrameMessage,
  drawFrameMessage,
  fitFrameMessage,
} from '../../frame-text.js';
import {
  createQrImageLayer,
  createQrModuleFill,
  drawCenterArtwork,
} from './style-drawing.js';
import { drawQrMatrix } from './module-rendering.js';

export function createQrRenderer(deps) {
  const {
    canvas,
    qrWidth,
    qrWidthAuto,
    colorLight,
    eyeCustomColorsEnabled,
    eyeOuterColor,
    eyeCenterColor,
    debugColors,
    debugUnmask,
    centerArtMode,
    centerEmoji,
    centerArtSize,
    centerArtBackground,
    pixelArtMatchModuleShape,
    moduleShape,
    frameMessageCenter,
    frameLineHeight,
    frameMessageColor,
    maxTargetWidth: MAX_QR_TARGET_WIDTH,
    formatWidthLabel,
    getCurrentFrameMessage,
    getFrameFont,
    isDebugOverlayActive,
    getCurrentModuleShapeOptions,
    getCurrentEyeShapeOptions,
    getCurrentGradientOptions,
    imageFillController,
    getCodewordStyle,
    getModuleContrastColor,
    centerLogoController,
    pixelArtEditor,
    readInteger,
    schedulePreviewViewportSync,
    setRenderMetrics,
    getActiveDebugOutlineMode,
    debugRenderer,
  } = deps;

  return function drawQr(qrDefinition, options) {
    const marginModules = options.margin ?? 4;
    const moduleCount = qrDefinition.modules.size;
    const totalModules = moduleCount + marginModules * 2;
    const minimumModuleScale = Math.max(1, options.scale ?? 4);
    const minimumCanvasSize = totalModules * minimumModuleScale;
    const maximumModuleScale = Math.max(
      minimumModuleScale,
      Math.floor(MAX_QR_TARGET_WIDTH / totalModules),
    );
    qrWidth.min = String(minimumCanvasSize);
    qrWidth.max = String(totalModules * maximumModuleScale);
    qrWidth.step = String(totalModules);
    const requestedCanvasSize =
      typeof options.width === 'number' ? options.width : minimumCanvasSize;
    const renderedModuleScale = Math.min(
      maximumModuleScale,
      Math.max(
        minimumModuleScale,
        Math.round(requestedCanvasSize / totalModules),
      ),
    );
    const canvasSize = totalModules * renderedModuleScale;
    if (!qrWidthAuto.checked) {
      qrWidth.value = String(canvasSize);
    }
    setRenderMetrics(canvasSize, renderedModuleScale);
    formatWidthLabel();
    const cornerRadius = Math.max(
      0,
      Math.min(16, ((canvasSize - 128) / 192) * 16),
    );
    canvas.style.setProperty(
      '--qr-corner-radius',
      `${cornerRadius.toFixed(2)}px`,
    );
    const cellSize = canvasSize / totalModules;
    const context = canvas.getContext('2d');
    const frameMessageText = getCurrentFrameMessage();
    const frameMessageIsCentered = frameMessageCenter.checked;
    const captionLineHeight = Number.parseInt(frameLineHeight.value, 10) || 18;
    const captionPadding = Math.max(7, Math.min(14, canvasSize * 0.035));
    const qrDrawSize = moduleCount * cellSize;
    const frameMessageMaximumWidth = frameMessageIsCentered
      ? Math.max(20, qrDrawSize * 0.56)
      : Math.max(20, canvasSize - captionPadding * 2);
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    const frameMessageLayout = frameMessageText
      ? fitFrameMessage(
          context,
          frameMessageText,
          frameMessageMaximumWidth,
          captionLineHeight,
          getFrameFont,
        )
      : { font: getFrameFont(captionLineHeight), lines: [] };
    const frameMessageLines = frameMessageLayout.lines;
    const captionHeight =
      frameMessageLines.length && !frameMessageIsCentered
        ? Math.ceil(
            frameMessageLines.length * captionLineHeight + captionPadding * 2,
          )
        : 0;
    const debugActive = isDebugOverlayActive();
    const debugModel = debugActive
      ? debugRenderer.buildModel(qrDefinition, options)
      : null;
    const moduleShapeOptions = getCurrentModuleShapeOptions();
    const eyeShapeOptions = getCurrentEyeShapeOptions();
    const customEyesActive = !debugActive && eyeShapeOptions.type !== 'default';
    const gradientOptions = getCurrentGradientOptions();
    const imageFillImage = imageFillController.getImage();
    const imageFillActive =
      !debugActive && gradientOptions.type === 'image' && imageFillImage;
    const customEyeColorsActive =
      !debugActive && !imageFillActive && eyeCustomColorsEnabled.checked;
    const lightAlpha = getColorAlpha(options.color.light);
    const gradientHasTransparency =
      (gradientOptions.type === 'linear' ||
        gradientOptions.type === 'radial') &&
      getColorAlpha(gradientOptions.endColor) < 1;
    const hasTransparency =
      !imageFillActive &&
      (getColorAlpha(options.color.dark) < 1 ||
        gradientHasTransparency ||
        lightAlpha < 1);
    const transparentLight = lightAlpha === 0;

    canvas.height = canvasSize + captionHeight;
    canvas.classList.toggle('has-transparency', hasTransparency);

    const backgroundColor = options.color.light;
    const quietColor = options.color.light;
    let imageFillLayer = null;

    context.clearRect(0, 0, canvas.width, canvas.height);
    if (imageFillActive) {
      context.fillStyle = colorLight.value;
      context.fillRect(0, 0, canvas.width, canvas.height);
      imageFillLayer = createQrImageLayer(
        context,
        imageFillImage,
        marginModules * cellSize,
        moduleCount * cellSize,
      );
      context.drawImage(imageFillLayer.layer, 0, 0);
      context.fillStyle = options.color.light;
      context.fillRect(
        marginModules * cellSize,
        marginModules * cellSize,
        moduleCount * cellSize,
        moduleCount * cellSize,
      );
    } else if (!transparentLight) {
      context.fillStyle = quietColor;
      context.fillRect(0, 0, canvas.width, canvas.height);

      context.fillStyle = backgroundColor;
      context.fillRect(
        marginModules * cellSize,
        marginModules * cellSize,
        moduleCount * cellSize,
        moduleCount * cellSize,
      );
    }

    const moduleFillStyle = createQrModuleFill(
      context,
      options.color.dark,
      gradientOptions,
      marginModules,
      moduleCount,
      cellSize,
    );
    const eyeOuterFillStyle = customEyeColorsActive
      ? eyeOuterColor.value
      : moduleFillStyle;
    const eyeCenterFillStyle = customEyeColorsActive
      ? eyeCenterColor.value
      : moduleFillStyle;

    drawQrMatrix({
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
      lightColor: options.color.light,
      darkColor: options.color.dark,
      transparentLight,
      getActiveDebugOutlineMode,
      getCodewordStyle,
      getModuleContrastColor,
    });

    drawCenterArtwork(
      context,
      marginModules * cellSize,
      moduleCount * cellSize,
      {
        mode: centerArtMode.value,
        logo: centerLogoController.getImage(),
        emoji: centerEmoji.value.trim(),
        pixelArt: pixelArtEditor.getState(),
        sizePercent: readInteger(centerArtSize) ?? 20,
        protectBackground: centerArtBackground.checked,
        lightColor: options.color.light,
        matchModuleShape:
          pixelArtMatchModuleShape.checked && moduleShape.value !== 'square',
        moduleShape: getCurrentModuleShapeOptions(),
      },
    );

    if (frameMessageIsCentered) {
      drawCenteredFrameMessage(
        context,
        frameMessageLines,
        frameMessageLayout.font,
        captionLineHeight,
        marginModules * cellSize + qrDrawSize / 2,
        frameMessageColor.value,
        options.color.light,
        cellSize,
      );
    } else {
      drawFrameMessage(
        context,
        frameMessageLines,
        canvasSize,
        captionHeight,
        frameMessageLayout.font,
        captionLineHeight,
        frameMessageColor.value,
      );
    }

    schedulePreviewViewportSync();
  };
}
