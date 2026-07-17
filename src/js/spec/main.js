import qrEncoder from '../qr/index.js';
import {
  buildDebugOverlayModel,
  getDebugCategory,
  moduleIsDark,
} from '../app/ui/debug/model.js';
import {
  getAlignmentPatternCenters,
  getDataTraversal,
  isFunctionModule,
} from '../app/qr-regions.js';
import { COUNT_BITS, MODE_BITS } from '../qr/constants.js';
import { isMaskActive } from '../qr/mask.js';
import { setupExternalLinks } from '../external-links.js';

setupExternalLinks();

const COLORS = {
  finder: '#ef4444',
  alignment: '#facc15',
  timing: '#06b6d4',
  format: '#8b5cf6',
  ecLevel: '#ec4899',
  mask: '#2563eb',
  version: '#10b981',
  darkModule: '#4c1d95',
  mode: '#0f766e',
  charCount: '#f97316',
  data: '#0ea5e9',
  terminator: '#84cc16',
  padding: '#cbd5e1',
  errorCorrection: '#111827',
  remainder: '#14b8a6',
  maskEffect: '#2563eb',
};
const MIXED_TEXT = '1234567890HELLO-world';

const createDefinition = (text, version, errorCorrectionLevel = 'M') => {
  const qr = qrEncoder.create(text, { version, errorCorrectionLevel });
  return {
    qr,
    model: buildDebugOverlayModel(qr, { errorCorrectionLevel }),
    traversal: getDataTraversal(qr),
  };
};

const large = createDefinition('QR SPEC VISUAL GUIDE 2026 / MODE + COUNT + PAYLOAD', 7, 'M');
const compact = createDefinition('QR GUIDE 123', 2, 'M');
const mixed = createDefinition(MIXED_TEXT, 1, 'L');

function indexesForRoles(definition, roles, limit = Infinity) {
  const indexes = [];
  definition.model.bitRoles.forEach((role, index) => {
    if (roles.includes(role) && indexes.length < limit) indexes.push(index);
  });
  return indexes;
}

function cropAroundModules(modules, size, padding = 2, minimum = 8) {
  if (!modules.length) return { row: 0, column: 0, rows: size, columns: size };
  const rows = modules.map(({ row }) => row);
  const columns = modules.map(({ column }) => column);
  let top = Math.max(0, Math.min(...rows) - padding);
  let left = Math.max(0, Math.min(...columns) - padding);
  let bottom = Math.min(size, Math.max(...rows) + padding + 1);
  let right = Math.min(size, Math.max(...columns) + padding + 1);
  while (bottom - top < minimum && (top > 0 || bottom < size)) {
    if (top > 0) top -= 1;
    if (bottom - top < minimum && bottom < size) bottom += 1;
  }
  while (right - left < minimum && (left > 0 || right < size)) {
    if (left > 0) left -= 1;
    if (right - left < minimum && right < size) right += 1;
  }
  return { row: top, column: left, rows: bottom - top, columns: right - left };
}

function modulesAtIndexes(definition, indexes) {
  return indexes.map((index) => definition.traversal[index]).filter(Boolean);
}

function getVisuals() {
  const largeSize = large.qr.modules.size;
  const compactSize = compact.qr.modules.size;
  const alignmentCenters = getAlignmentPatternCenters(large.qr.version);
  const alignmentCenter = alignmentCenters.at(-1);
  const headerIndexes = indexesForRoles(large, ['mode', 'charCount'], 24);
  const payloadIndexes = indexesForRoles(large, ['payload'], 56);
  const paddingIndexes = indexesForRoles(large, ['terminator', 'bytePad', 'padByte'], 48);
  const ecIndexes = indexesForRoles(large, ['errorCorrection'], 80);
  const remainderIndexes = indexesForRoles(compact, ['remainder'], 8);
  const mixedStreamIndexes = indexesForRoles(mixed, ['mode', 'charCount', 'payload']);

  return {
    overview: { definition: large, crop: { row: 0, column: 0, rows: largeSize, columns: largeSize } },
    finder: { definition: large, crop: { row: 0, column: 0, rows: 9, columns: 9 }, focus: ['finder'] },
    alignment: {
      definition: large,
      crop: { row: alignmentCenter - 3, column: alignmentCenter - 3, rows: 7, columns: 7 },
      focus: ['alignment'],
    },
    timing: { definition: large, crop: { row: 4, column: 4, rows: 14, columns: 20 }, focus: ['timing'] },
    'dark-module': {
      definition: large,
      crop: { row: largeSize - 11, column: 5, rows: 8, columns: 8 },
      focus: ['darkModule'],
    },
    format: {
      definition: large,
      crop: { row: 0, column: 0, rows: 11, columns: 11 },
      focus: ['ecLevel', 'mask', 'format'],
    },
    version: {
      definition: large,
      crop: { row: 0, column: largeSize - 13, rows: 10, columns: 13 },
      focus: ['version'],
    },
    header: {
      definition: large,
      crop: cropAroundModules(modulesAtIndexes(large, [...headerIndexes, ...payloadIndexes.slice(0, 12)]), largeSize),
      focus: ['mode', 'charCount', 'data'],
      pathIndexes: [...headerIndexes, ...payloadIndexes.slice(0, 12)],
    },
    padding: {
      definition: large,
      crop: cropAroundModules(modulesAtIndexes(large, paddingIndexes), largeSize),
      focus: ['terminator', 'padding'],
      pathIndexes: paddingIndexes,
    },
    remainder: {
      definition: compact,
      crop: cropAroundModules(modulesAtIndexes(compact, remainderIndexes), compactSize, 3, 10),
      focus: ['remainder'],
      pathIndexes: remainderIndexes,
    },
    'error-correction': {
      definition: large,
      crop: cropAroundModules(modulesAtIndexes(large, ecIndexes), largeSize),
      focus: ['data', 'errorCorrection'],
      pathIndexes: ecIndexes,
    },
    mask: {
      definition: compact,
      crop: { row: 0, column: 0, rows: compactSize, columns: compactSize },
      focus: ['maskEffect'],
      showMaskEffect: true,
    },
    mixed: {
      definition: mixed,
      crop: { row: 0, column: 0, rows: mixed.qr.modules.size, columns: mixed.qr.modules.size },
      pathIndexes: mixedStreamIndexes,
    },
  };
}

function getCategory(definition, row, column, showMaskEffect) {
  const { qr, model } = definition;
  if (showMaskEffect && !isFunctionModule(qr, row, column) && isMaskActive(qr.maskPattern, row, column)) {
    return 'maskEffect';
  }
  return getDebugCategory(row, column, qr, model, 'overlay');
}

function drawPath(context, visual, geometry) {
  if (!visual.pathIndexes?.length) return;
  const { definition, crop } = visual;
  const points = visual.pathIndexes
    .map((index) => definition.traversal[index])
    .filter((module) => module
      && module.row >= crop.row && module.row < crop.row + crop.rows
      && module.column >= crop.column && module.column < crop.column + crop.columns)
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
  context.arc(points[0].x, points[0].y, Math.max(2, geometry.module * 0.16), 0, Math.PI * 2);
  context.fillStyle = '#fff';
  context.fill();
  context.restore();
}

function renderVisual(canvas, visual) {
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  const width = Math.max(240, Math.round(canvas.clientWidth || 360));
  const height = Math.max(150, Math.round(canvas.clientHeight || width * 0.625));
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  const context = canvas.getContext('2d');
  context.scale(ratio, ratio);
  context.imageSmoothingEnabled = false;
  context.clearRect(0, 0, width, height);

  const { qr } = visual.definition;
  const crop = visual.crop;
  const moduleSize = Math.max(1, Math.floor(Math.min((width - 18) / crop.columns, (height - 18) / crop.rows)));
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
      const category = getCategory(visual.definition, row, column, visual.showMaskEffect);
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
const renderAll = () => canvases.forEach((canvas) => {
  const visual = visuals[canvas.dataset.qrVisual];
  if (visual) renderVisual(canvas, visual);
});

const MASK_LANDMARKS = new Set(['finder', 'alignment', 'timing']);
const maskCanvases = [...document.querySelectorAll('[data-mask-preview]')];

function renderMaskPreview(canvas) {
  const maskPattern = Number.parseInt(canvas.dataset.maskPreview, 10);
  const qr = qrEncoder.create('MASK PATTERN', { version: 2, errorCorrectionLevel: 'M', maskPattern });
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
  const moduleSize = Math.max(1, Math.floor(width / (qr.modules.size + margin * 2)));
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
      } else if (!isFunctionModule(qr, row, column) && isMaskActive(maskPattern, row, column)) {
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

function toBits(value, length) {
  return Number(value).toString(2).padStart(length, '0');
}

function getCountWidth(mode, version = 1) {
  const bucket = version <= 9 ? 0 : version <= 26 ? 1 : 2;
  return COUNT_BITS[mode][bucket];
}

function describeUnit(mode, value, segment) {
  if (mode === 'numeric') return `${value} is stored as one ${segment.bits.length}-bit binary number.`;
  if (mode === 'alphanumeric') return `A x 45 + B = 461, stored in ${segment.bits.length} bits.`;
  if (mode === 'byte') return 'The visible character is UTF-8 C3 A9, so the count is 2 and the payload is 16 bits.';
  const shiftJis = qrEncoder.toSJIS(value).toString(16).toUpperCase().padStart(4, '0');
  return `Shift JIS ${shiftJis} is transformed into one 13-bit QR Kanji value.`;
}

document.querySelectorAll('[data-unit-mode]').forEach((example) => {
  const mode = example.dataset.unitMode;
  const value = example.dataset.unitValue;
  const definition = qrEncoder.create([{ mode, data: value }], { version: 1, errorCorrectionLevel: 'L' });
  const segment = definition.segments[0];
  example.querySelector('[data-mode-bits]').textContent = toBits(MODE_BITS[mode], 4);
  example.querySelector('[data-count-bits]').textContent = toBits(segment.characterCount, getCountWidth(mode));
  example.querySelector('[data-payload-bits]').textContent = segment.bits.join('');
  example.querySelector('[data-unit-detail]').textContent = describeUnit(mode, value, segment);
});

const mixedSegments = qrEncoder.internals.optimizeSegments(MIXED_TEXT, 1);
const mixedStream = document.getElementById('mixed-mode-stream');
if (mixedStream) {
  mixedSegments.forEach((segment, index) => {
    const mode = segment.mode;
    const element = document.createElement('article');
    element.className = `mixed-segment ${mode}`;
    const number = document.createElement('span');
    number.className = 'segment-number';
    number.textContent = `Segment ${index + 1}`;
    const heading = document.createElement('strong');
    heading.textContent = mode === 'alphanumeric' ? 'Alphanumeric' : `${mode[0].toUpperCase()}${mode.slice(1)}`;
    const source = document.createElement('code');
    source.textContent = segment.data;
    const fields = document.createElement('span');
    fields.textContent = `mode ${toBits(MODE_BITS[mode], 4)} | count ${toBits(segment.characterCount, getCountWidth(mode))} | payload ${segment.bits.length} bits`;
    element.append(number, heading, source, fields);
    mixedStream.append(element);
  });

  const mixedBits = mixedSegments.reduce((total, segment) =>
    total + 4 + getCountWidth(segment.mode) + segment.bits.length, 0);
  const byteSegment = qrEncoder.create([{ mode: 'byte', data: MIXED_TEXT }], {
    version: 2,
    errorCorrectionLevel: 'L',
  }).segments[0];
  const byteBits = 4 + getCountWidth('byte') + byteSegment.bits.length;
  document.getElementById('mixed-mode-savings').textContent = `${mixedBits} bits vs ${byteBits} all-Byte`;
}
