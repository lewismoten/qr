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
    debugColors,
    isDebugUnmasked,
    maxTargetWidth: MAX_QR_TARGET_WIDTH,
    formatWidthLabel,
    getCurrentFrameMessage,
    getFrameFont,
    isDebugOverlayActive,
    getCurrentModuleShapeOptions,
    getCurrentEyeShapeOptions,
    getCurrentGradientOptions,
    getCurrentEyeColors,
    getCurrentArtworkOptions,
    getCurrentFrameOptions,
    imageFillController,
    getCodewordStyle,
    getModuleContrastColor,
    centerLogoController,
    pixelArtEditor,
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
    const frameOptions = getCurrentFrameOptions();
    const frameMessageIsCentered = frameOptions.centered;
    const captionLineHeight = frameOptions.lineHeight;
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
    const eyeColors = getCurrentEyeColors();
    const imageFillImage = imageFillController.getImage();
    const imageFillActive =
      !debugActive && gradientOptions.type === 'image' && imageFillImage;
    const customEyeColorsActive =
      !debugActive && !imageFillActive && eyeColors.enabled;
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
      context.fillStyle = options.color.light;
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
      ? eyeColors.outer
      : moduleFillStyle;
    const eyeCenterFillStyle = customEyeColorsActive
      ? eyeColors.center
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
      debugUnmask: isDebugUnmasked(),
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

    const artworkOptions = getCurrentArtworkOptions();
    drawCenterArtwork(
      context,
      marginModules * cellSize,
      moduleCount * cellSize,
      {
        mode: artworkOptions.mode,
        logo: centerLogoController.getImage(),
        emoji: artworkOptions.emoji,
        pixelArt: pixelArtEditor.getState(),
        sizePercent: artworkOptions.sizePercent,
        protectBackground: artworkOptions.protectBackground,
        outlinePercent: artworkOptions.outlinePercent,
        lightColor: options.color.light,
        matchModuleShape:
          artworkOptions.matchModuleShape &&
          moduleShapeOptions.type !== 'square',
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
        frameOptions.color,
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
        frameOptions.color,
      );
    }

    schedulePreviewViewportSync();
  };
}
