import {
  coordKey,
  getDataTraversal,
  getFormatBitGroups,
  getFormatInfoCoordinates,
  getModuleCategory,
  getVersionInfoCoordinates,
  isFunctionModule,
} from '../../qr/qr-regions.js';
import {
  buildEncodingUnitGroups,
  buildPostHeaderStreamGroups,
  classifyTraversalBits,
  QR_STREAM_GROUP,
  QR_STREAM_ROLE,
  summarizeCodewordRoles,
} from '../../qr/qr-stream.js';
import qrEncoder, { isMaskActive } from '@lewismoten/qr';

const ERROR_CORRECTION_LEVEL_BIT_COUNT = 2;
const MASK_PATTERN_BIT_END = 5;
const VERSION_INFORMATION_MINIMUM_VERSION = 7;
const BITS_PER_CODEWORD = 8;

export function moduleIsDark(qrDefinition, row, column) {
  if (typeof qrDefinition.modules.get === 'function')
    return qrDefinition.modules.get(row, column);
  return Boolean(
    qrDefinition.modules.data[row * qrDefinition.modules.size + column],
  );
}

export function moduleIsDarkForPreview(
  qrDefinition,
  row,
  column,
  debugActive,
  unmaskEnabled,
) {
  const dark = moduleIsDark(qrDefinition, row, column);
  if (
    !debugActive ||
    !unmaskEnabled ||
    isFunctionModule(qrDefinition, row, column)
  )
    return dark;
  return isMaskActive(qrDefinition.maskPattern, row, column) ? !dark : dark;
}

function splitCoordinateRuns(coordinates) {
  if (coordinates.length === 0) return [];
  const runs = [[coordinates[0]]];
  for (let index = 1; index < coordinates.length; index += 1) {
    const previous = coordinates[index - 1];
    const current = coordinates[index];
    const distance =
      Math.abs(current[0] - previous[0]) + Math.abs(current[1] - previous[1]);
    if (distance === 1) runs.at(-1).push(current);
    else runs.push([current]);
  }
  return runs;
}

function pushMetadataGroups(groups, coordinates, role, sequenceId) {
  const runs = splitCoordinateRuns(coordinates);
  runs.forEach((run, runIndex) => {
    groups.push({
      kind: 'metadata',
      modules: run.map(([row, column]) => ({ row, column })),
      roles: [role],
      metadataRole: role,
      metadataSeqId: sequenceId,
      metadataRunIndex: runIndex,
      metadataRunCount: runs.length,
    });
  });
}

function buildMetadataGroups(qrDefinition) {
  const size = qrDefinition.modules.size;
  const { primary, secondary } = getFormatInfoCoordinates(size);
  const groups = [];
  pushMetadataGroups(
    groups,
    primary.slice(0, ERROR_CORRECTION_LEVEL_BIT_COUNT),
    'ecLevel',
    'ecLevel-primary',
  );
  pushMetadataGroups(
    groups,
    primary.slice(ERROR_CORRECTION_LEVEL_BIT_COUNT, MASK_PATTERN_BIT_END),
    'mask',
    'mask-primary',
  );
  pushMetadataGroups(
    groups,
    primary.slice(MASK_PATTERN_BIT_END),
    'format',
    'format-primary',
  );
  pushMetadataGroups(
    groups,
    secondary.slice(0, ERROR_CORRECTION_LEVEL_BIT_COUNT),
    'ecLevel',
    'ecLevel-secondary',
  );
  pushMetadataGroups(
    groups,
    secondary.slice(ERROR_CORRECTION_LEVEL_BIT_COUNT, MASK_PATTERN_BIT_END),
    'mask',
    'mask-secondary',
  );
  pushMetadataGroups(
    groups,
    secondary.slice(MASK_PATTERN_BIT_END),
    'format',
    'format-secondary',
  );
  if (qrDefinition.version >= VERSION_INFORMATION_MINIMUM_VERSION) {
    const versionInfo = getVersionInfoCoordinates(size);
    pushMetadataGroups(
      groups,
      versionInfo.primary,
      'version',
      'version-primary',
    );
    pushMetadataGroups(
      groups,
      versionInfo.secondary,
      'version',
      'version-secondary',
    );
  }
  return groups;
}

export function buildDebugOverlayModel(qrDefinition, options) {
  const traversal = getDataTraversal(qrDefinition);
  const dataCodewords = qrEncoder.internals.getDataCodewords(
    qrDefinition.version,
    options.errorCorrectionLevel,
  );
  const bitRoles = classifyTraversalBits(
    qrDefinition,
    dataCodewords,
    traversal.length,
  );
  const roleSets = {
    [QR_STREAM_ROLE.mode]: new Set(),
    [QR_STREAM_ROLE.characterCount]: new Set(),
    [QR_STREAM_ROLE.payload]: new Set(),
    [QR_STREAM_ROLE.terminator]: new Set(),
    [QR_STREAM_ROLE.byteAlignment]: new Set(),
    [QR_STREAM_ROLE.errorCorrection]: new Set(),
    [QR_STREAM_ROLE.remainder]: new Set(),
  };
  const fieldStarts = [];
  bitRoles.forEach((role, index) => {
    if (index === 0 || role !== bitRoles[index - 1])
      fieldStarts.push({ role, module: traversal[index] });
  });
  traversal.forEach((module, index) => {
    const role = bitRoles[index];
    const target =
      role === QR_STREAM_ROLE.paddingCodeword
        ? roleSets[QR_STREAM_ROLE.byteAlignment]
        : roleSets[role];
    target?.add(coordKey(module.row, module.column));
  });
  const codewords = [];
  for (let index = 0; index < traversal.length; index += BITS_PER_CODEWORD) {
    const roles = bitRoles.slice(index, index + BITS_PER_CODEWORD);
    codewords.push({
      kind: summarizeCodewordRoles(roles),
      modules: traversal.slice(index, index + BITS_PER_CODEWORD),
      roles,
    });
  }
  const { ecLevelBits, maskBits } = getFormatBitGroups(
    qrDefinition.modules.size,
  );
  return {
    modeBits: roleSets[QR_STREAM_ROLE.mode],
    charCountBits: roleSets[QR_STREAM_ROLE.characterCount],
    payloadBits: roleSets[QR_STREAM_ROLE.payload],
    terminatorBits: roleSets[QR_STREAM_ROLE.terminator],
    bytePadBits: roleSets[QR_STREAM_ROLE.byteAlignment],
    ecBits: roleSets[QR_STREAM_ROLE.errorCorrection],
    remainderBits: roleSets[QR_STREAM_ROLE.remainder],
    ecLevelBits,
    maskBits,
    bitRoles,
    fieldStarts,
    codewords,
    streamGroups: buildPostHeaderStreamGroups(traversal, bitRoles),
    unitGroups: buildEncodingUnitGroups(qrDefinition, traversal),
    metadataGroups: buildMetadataGroups(qrDefinition),
  };
}

export function getDebugCategory(
  row,
  column,
  qrDefinition,
  model,
  purpose = 'overlay',
) {
  const key = coordKey(row, column);
  const categories = [
    [QR_STREAM_ROLE.errorCorrection, model.ecBits],
    [QR_STREAM_ROLE.mode, model.modeBits],
    [QR_STREAM_ROLE.characterCount, model.charCountBits],
    [QR_STREAM_GROUP.data, model.payloadBits],
    [QR_STREAM_ROLE.terminator, model.terminatorBits],
    [QR_STREAM_GROUP.padding, model.bytePadBits],
    [QR_STREAM_ROLE.remainder, model.remainderBits],
  ];
  const match = categories.find(([, coordinates]) => coordinates.has(key));
  if (match) return match[0];
  if (model.codewords.length === 0 && purpose === 'overlay')
    return getModuleCategory(qrDefinition, row, column);
  if (model.ecLevelBits.has(key)) return 'ecLevel';
  if (model.maskBits.has(key)) return 'mask';
  if (
    purpose === 'overlay' &&
    model.codewords.some(
      (codeword) =>
        codeword.kind === QR_STREAM_ROLE.remainder &&
        codeword.modules.some(
          (module) => module.row === row && module.column === column,
        ),
    )
  ) {
    return QR_STREAM_ROLE.remainder;
  }
  return getModuleCategory(qrDefinition, row, column);
}
