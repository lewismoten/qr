import qrEncoder, { isMaskActive } from '@lewismoten/qr';
import {
  buildDebugOverlayModel,
  getDebugCategory,
  moduleIsDark,
} from '../app/ui/debug/model.js';
import { isFunctionModule } from '../app/qr/qr-regions.js';
import { setupExternalLinks } from '../external-links.js';
import { initializeLanguage, translateDocument } from '../i18n/index.js';
import { renderEncodingExamples } from './encoding-examples.js';
import { COLORS, getVisuals } from './visual-models.js';

const guideLocale = document.documentElement.dataset.guideLocale;
if (guideLocale) {
  const localeBase = document.documentElement.dataset.localeBase || 'locales/';
  await initializeLanguage({
    locale: guideLocale,
    baseUrl: new URL(localeBase, document.baseURI),
  });
  translateDocument(document);
}

setupExternalLinks();

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
      x: geometry.left + (module.column - crop.column + 0.5) * geometry.module,
      y: geometry.top + (module.row - crop.row + 0.5) * geometry.module,
    }));
  if (points.length < 2) return;
  context.save();
  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  points.slice(1).forEach(({ x, y }) => context.lineTo(x, y));
  context.lineWidth = Math.max(1.5, geometry.module * 0.11);
  context.strokeStyle = 'rgba(255,255,255,0.9)';
  context.shadowColor = 'rgba(7,24,39,0.7)';
  context.shadowBlur = Math.max(1, geometry.module * 0.12);
  context.stroke();
  context.beginPath();
  context.arc(
    points[0].x,
    points[0].y,
    Math.max(2, geometry.module * 0.16),
    0,
    Math.PI * 2,
  );
  context.fillStyle = '#fff';
  context.fill();
  context.restore();
}

function renderVisual(canvas, visual) {
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  const width = Math.max(240, Math.round(canvas.clientWidth || 360));
  const height = Math.max(
    150,
    Math.round(canvas.clientHeight || width * 0.625),
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
      Math.min((width - 18) / crop.columns, (height - 18) / crop.rows),
    ),
  );
  const matrixWidth = moduleSize * crop.columns;
  const matrixHeight = moduleSize * crop.rows;
  const left = Math.round((width - matrixWidth) / 2);
  const top = Math.round((height - matrixHeight) / 2);
  context.fillStyle = '#f8faf9';
  context.fillRect(left, top, matrixWidth, matrixHeight);

  for (let localRow = 0; localRow < crop.rows; localRow += 1) {
    for (let localColumn = 0; localColumn < crop.columns; localColumn += 1) {
      const row = crop.row + localRow;
      const column = crop.column + localColumn;
      const x = left + localColumn * moduleSize;
      const y = top + localRow * moduleSize;
      context.fillStyle = moduleIsDark(qr, row, column) ? '#071827' : '#fffaf0';
      context.fillRect(x, y, moduleSize, moduleSize);
      const category = getCategory(
        visual.definition,
        row,
        column,
        visual.showMaskEffect,
      );
      const focused = !visual.focus || visual.focus.includes(category);
      context.globalAlpha = focused ? 0.76 : 0.1;
      context.fillStyle = COLORS[category] || COLORS.data;
      context.fillRect(x, y, moduleSize, moduleSize);
      context.globalAlpha = 1;
      if (moduleSize >= 7) {
        context.strokeStyle = 'rgba(255,255,255,0.22)';
        context.lineWidth = 1;
        context.strokeRect(x + 0.5, y + 0.5, moduleSize - 1, moduleSize - 1);
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
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  const width = Math.max(120, Math.round(canvas.clientWidth || 180));
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(width * ratio);
  const context = canvas.getContext('2d');
  context.scale(ratio, ratio);
  context.imageSmoothingEnabled = false;
  context.fillStyle = '#f8faf9';
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
        context.fillStyle = '#071827';
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
