import qrEncoder, { isMaskActive } from '@lewismoten/qr';
import {
  buildDebugOverlayModel,
  getDebugCategory,
  moduleIsDark,
} from '../app/ui/debug/model.js';
import { isFunctionModule } from '../app/qr/qr-regions.js';
import { setupExternalLinks } from '../external-links.js';
import { initializeLanguage, translateDocument } from '../i18n/index.js';
import { setupHandbookExports } from '../info/handbook/handbook-setup.js';
import { setupFooterActions } from '../info/footer-actions.js';
import { renderEncodingExamples } from './encoding-examples.js';
import { COLORS, getVisuals } from './visual-models.js';

const FULL_CIRCLE_RADIANS = Math.PI * 2;
const MODULE_CENTER_OFFSET = 0.5;
const SPEC_CANVAS_COLORS = Object.freeze({
  background: '#f8faf9',
  darkModule: '#071827',
  lightModule: '#fffaf0',
  path: 'rgba(255,255,255,0.9)',
  pathOrigin: '#fff',
  pathShadow: 'rgba(7,24,39,0.7)',
  moduleGrid: 'rgba(255,255,255,0.22)',
});
const PATH_STYLE = Object.freeze({
  minimumLineWidth: 1.5,
  lineWidthScale: 0.11,
  shadowBlurScale: 0.12,
  minimumStartRadius: 2,
  startRadiusScale: 0.16,
});
const CANVAS_LAYOUT = Object.freeze({
  maximumPixelRatio: 2,
  minimumWidth: 240,
  fallbackWidth: 360,
  minimumHeight: 150,
  heightToWidthRatio: 0.625,
  padding: 18,
  focusedOpacity: 0.76,
  unfocusedOpacity: 0.1,
  gridMinimumModuleSize: 7,
});
const MASK_PREVIEW_LAYOUT = Object.freeze({
  minimumWidth: 120,
  fallbackWidth: 180,
});

const guideLocale = document.documentElement.dataset.guideLocale;
if (guideLocale) {
  const localeBase = document.documentElement.dataset.localeBase || 'locales/';
  await initializeLanguage({
    locale: guideLocale,
    baseUrl: new URL(localeBase, document.baseURI),
  });
  await translateDocument(document);
}

setupFooterActions();
setupExternalLinks();
if (!new URLSearchParams(location.search).has('handbook-source')) {
  setupHandbookExports(guideLocale || 'en-US');
}

function getCategory(definition, row, column, showMaskEffect) {
  const { qr, model } = definition;
  if (
    showMaskEffect &&
    !isFunctionModule(qr, row, column) &&
    isMaskActive(qr.maskPattern, row, column)
  ) {
    return 'maskEffect';
  }
  return getDebugCategory(row, column, qr, model, 'overlay');
}

function drawPath(context, visual, geometry) {
  if (!visual.pathIndexes?.length) return;
  const { definition, crop } = visual;
  const points = visual.pathIndexes
    .map((index) => definition.traversal[index])
    .filter(
      (module) =>
        module &&
        module.row >= crop.row &&
        module.row < crop.row + crop.rows &&
        module.column >= crop.column &&
        module.column < crop.column + crop.columns,
    )
    .map((module) => ({
      x:
        geometry.left +
        (module.column - crop.column + MODULE_CENTER_OFFSET) * geometry.module,
      y:
        geometry.top +
        (module.row - crop.row + MODULE_CENTER_OFFSET) * geometry.module,
    }));
  if (points.length < 2) return;
  context.save();
  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  points.slice(1).forEach(({ x, y }) => context.lineTo(x, y));
  context.lineWidth = Math.max(
    PATH_STYLE.minimumLineWidth,
    geometry.module * PATH_STYLE.lineWidthScale,
  );
  context.strokeStyle = SPEC_CANVAS_COLORS.path;
  context.shadowColor = SPEC_CANVAS_COLORS.pathShadow;
  context.shadowBlur = Math.max(
    1,
    geometry.module * PATH_STYLE.shadowBlurScale,
  );
  context.stroke();
  context.beginPath();
  context.arc(
    points[0].x,
    points[0].y,
    Math.max(
      PATH_STYLE.minimumStartRadius,
      geometry.module * PATH_STYLE.startRadiusScale,
    ),
    0,
    FULL_CIRCLE_RADIANS,
  );
  context.fillStyle = SPEC_CANVAS_COLORS.pathOrigin;
  context.fill();
  context.restore();
}

function renderVisual(canvas, visual) {
  const ratio = Math.min(
    CANVAS_LAYOUT.maximumPixelRatio,
    window.devicePixelRatio || 1,
  );
  const width = Math.max(
    CANVAS_LAYOUT.minimumWidth,
    Math.round(canvas.clientWidth || CANVAS_LAYOUT.fallbackWidth),
  );
  const height = Math.max(
    CANVAS_LAYOUT.minimumHeight,
    Math.round(canvas.clientHeight || width * CANVAS_LAYOUT.heightToWidthRatio),
  );
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  const context = canvas.getContext('2d');
  context.scale(ratio, ratio);
  context.imageSmoothingEnabled = false;
  context.clearRect(0, 0, width, height);

  const { qr } = visual.definition;
  const crop = visual.crop;
  const moduleSize = Math.max(
    1,
    Math.floor(
      Math.min(
        (width - CANVAS_LAYOUT.padding) / crop.columns,
        (height - CANVAS_LAYOUT.padding) / crop.rows,
      ),
    ),
  );
  const matrixWidth = moduleSize * crop.columns;
  const matrixHeight = moduleSize * crop.rows;
  const left = Math.round((width - matrixWidth) / 2);
  const top = Math.round((height - matrixHeight) / 2);
  context.fillStyle = SPEC_CANVAS_COLORS.background;
  context.fillRect(left, top, matrixWidth, matrixHeight);

  for (let localRow = 0; localRow < crop.rows; localRow += 1) {
    for (let localColumn = 0; localColumn < crop.columns; localColumn += 1) {
      const row = crop.row + localRow;
      const column = crop.column + localColumn;
      const x = left + localColumn * moduleSize;
      const y = top + localRow * moduleSize;
      context.fillStyle = moduleIsDark(qr, row, column)
        ? SPEC_CANVAS_COLORS.darkModule
        : SPEC_CANVAS_COLORS.lightModule;
      context.fillRect(x, y, moduleSize, moduleSize);
      const category = getCategory(
        visual.definition,
        row,
        column,
        visual.showMaskEffect,
      );
      const focused = !visual.focus || visual.focus.includes(category);
      context.globalAlpha = focused
        ? CANVAS_LAYOUT.focusedOpacity
        : CANVAS_LAYOUT.unfocusedOpacity;
      context.fillStyle = COLORS[category] || COLORS.data;
      context.fillRect(x, y, moduleSize, moduleSize);
      context.globalAlpha = 1;
      if (moduleSize >= CANVAS_LAYOUT.gridMinimumModuleSize) {
        context.strokeStyle = SPEC_CANVAS_COLORS.moduleGrid;
        context.lineWidth = 1;
        context.strokeRect(
          x + MODULE_CENTER_OFFSET,
          y + MODULE_CENTER_OFFSET,
          moduleSize - 1,
          moduleSize - 1,
        );
      }
    }
  }
  drawPath(context, visual, { left, top, module: moduleSize });
}

const visuals = getVisuals();
const canvases = [...document.querySelectorAll('[data-qr-visual]')];
const renderAll = () =>
  canvases.forEach((canvas) => {
    const visual = visuals[canvas.dataset.qrVisual];
    if (visual) renderVisual(canvas, visual);
  });

const MASK_LANDMARKS = new Set(['finder', 'alignment', 'timing']);
const maskCanvases = [...document.querySelectorAll('[data-mask-preview]')];

function renderMaskPreview(canvas) {
  const maskPattern = Number.parseInt(canvas.dataset.maskPreview, 10);
  const qr = qrEncoder.create('MASK PATTERN', {
    version: 2,
    errorCorrectionLevel: 'M',
    maskPattern,
  });
  const model = buildDebugOverlayModel(qr, { errorCorrectionLevel: 'M' });
  const ratio = Math.min(
    CANVAS_LAYOUT.maximumPixelRatio,
    window.devicePixelRatio || 1,
  );
  const width = Math.max(
    MASK_PREVIEW_LAYOUT.minimumWidth,
    Math.round(canvas.clientWidth || MASK_PREVIEW_LAYOUT.fallbackWidth),
  );
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(width * ratio);
  const context = canvas.getContext('2d');
  context.scale(ratio, ratio);
  context.imageSmoothingEnabled = false;
  context.fillStyle = SPEC_CANVAS_COLORS.background;
  context.fillRect(0, 0, width, width);
  const margin = 1;
  const moduleSize = Math.max(
    1,
    Math.floor(width / (qr.modules.size + margin * 2)),
  );
  const matrixSize = (qr.modules.size + margin * 2) * moduleSize;
  const offset = Math.floor((width - matrixSize) / 2) + margin * moduleSize;

  for (let row = 0; row < qr.modules.size; row += 1) {
    for (let column = 0; column < qr.modules.size; column += 1) {
      const x = offset + column * moduleSize;
      const y = offset + row * moduleSize;
      const category = getDebugCategory(row, column, qr, model, 'overlay');
      if (MASK_LANDMARKS.has(category) && moduleIsDark(qr, row, column)) {
        context.fillStyle = SPEC_CANVAS_COLORS.darkModule;
        context.fillRect(x, y, moduleSize, moduleSize);
      } else if (
        !isFunctionModule(qr, row, column) &&
        isMaskActive(maskPattern, row, column)
      ) {
        context.fillStyle = COLORS.maskEffect;
        context.fillRect(x, y, moduleSize, moduleSize);
      }
    }
  }
}

const renderPage = () => {
  renderAll();
  maskCanvases.forEach(renderMaskPreview);
};

let resizeRequest = 0;
window.addEventListener('resize', () => {
  cancelAnimationFrame(resizeRequest);
  resizeRequest = requestAnimationFrame(renderPage);
});
renderPage();
renderEncodingExamples();
