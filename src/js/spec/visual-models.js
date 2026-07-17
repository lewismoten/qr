import { buildDebugOverlayModel } from '../app/ui/debug/model.js';
import {
  getAlignmentPatternCenters,
  getDataTraversal,
} from '../app/qr-regions.js';
import qrEncoder from '../qr/matrix-encoder.js';

export const COLORS = {
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
export const MIXED_TEXT = '1234567890HELLO-world';

const createDefinition = (text, version, errorCorrectionLevel = 'M') => {
  const qr = qrEncoder.create(text, { version, errorCorrectionLevel });
  return {
    qr,
    model: buildDebugOverlayModel(qr, { errorCorrectionLevel }),
    traversal: getDataTraversal(qr),
  };
};

const large = createDefinition(
  'QR SPEC VISUAL GUIDE 2026 / MODE + COUNT + PAYLOAD',
  7,
  'M',
);
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

export function getVisuals() {
  const largeSize = large.qr.modules.size;
  const compactSize = compact.qr.modules.size;
  const alignmentCenter = getAlignmentPatternCenters(large.qr.version).at(-1);
  const headerIndexes = indexesForRoles(large, ['mode', 'charCount'], 24);
  const payloadIndexes = indexesForRoles(large, ['payload'], 56);
  const paddingIndexes = indexesForRoles(
    large,
    ['terminator', 'bytePad', 'padByte'],
    48,
  );
  const ecIndexes = indexesForRoles(large, ['errorCorrection'], 80);
  const remainderIndexes = indexesForRoles(compact, ['remainder'], 8);
  const mixedIndexes = indexesForRoles(mixed, ['mode', 'charCount', 'payload']);

  return {
    overview: {
      definition: large,
      crop: { row: 0, column: 0, rows: largeSize, columns: largeSize },
    },
    finder: {
      definition: large,
      crop: { row: 0, column: 0, rows: 9, columns: 9 },
      focus: ['finder'],
    },
    alignment: {
      definition: large,
      crop: {
        row: alignmentCenter - 3,
        column: alignmentCenter - 3,
        rows: 7,
        columns: 7,
      },
      focus: ['alignment'],
    },
    timing: {
      definition: large,
      crop: { row: 4, column: 4, rows: 14, columns: 20 },
      focus: ['timing'],
    },
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
      crop: cropAroundModules(
        modulesAtIndexes(large, [
          ...headerIndexes,
          ...payloadIndexes.slice(0, 12),
        ]),
        largeSize,
      ),
      focus: ['mode', 'charCount', 'data'],
      pathIndexes: [...headerIndexes, ...payloadIndexes.slice(0, 12)],
    },
    padding: {
      definition: large,
      crop: cropAroundModules(
        modulesAtIndexes(large, paddingIndexes),
        largeSize,
      ),
      focus: ['terminator', 'padding'],
      pathIndexes: paddingIndexes,
    },
    remainder: {
      definition: compact,
      crop: cropAroundModules(
        modulesAtIndexes(compact, remainderIndexes),
        compactSize,
        3,
        10,
      ),
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
      crop: {
        row: 0,
        column: 0,
        rows: mixed.qr.modules.size,
        columns: mixed.qr.modules.size,
      },
      pathIndexes: mixedIndexes,
    },
  };
}
