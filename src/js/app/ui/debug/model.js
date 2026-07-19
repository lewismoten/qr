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
  summarizeCodewordRoles,
} from '../../qr/qr-stream.js';
import qrEncoder, { isMaskActive } from '@lewismoten/qr';

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
      metadataSequenceId: sequenceId,
      metadataRunIndex: runIndex,
      metadataRunCount: runs.length,
    });
  });
}

function buildMetadataGroups(qrDefinition) {
  const size = qrDefinition.modules.size;
  const { primary, secondary } = getFormatInfoCoordinates(size);
  const groups = [];
  pushMetadataGroups(groups, primary.slice(0, 2), 'ecLevel', 'ecLevel-primary');
  pushMetadataGroups(groups, primary.slice(2, 5), 'mask', 'mask-primary');
  pushMetadataGroups(groups, primary.slice(5), 'format', 'format-primary');
  pushMetadataGroups(
    groups,
    secondary.slice(0, 2),
    'ecLevel',
    'ecLevel-secondary',
  );
  pushMetadataGroups(groups, secondary.slice(2, 5), 'mask', 'mask-secondary');
  pushMetadataGroups(groups, secondary.slice(5), 'format', 'format-secondary');
  if (qrDefinition.version >= 7) {
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
    mode: new Set(),
    charCount: new Set(),
    payload: new Set(),
    terminator: new Set(),
    bytePad: new Set(),
    errorCorrection: new Set(),
    remainder: new Set(),
  };
  const fieldStarts = [];
  bitRoles.forEach((role, index) => {
    if (index === 0 || role !== bitRoles[index - 1])
      fieldStarts.push({ role, module: traversal[index] });
  });
  traversal.forEach((module, index) => {
    const role = bitRoles[index];
    const target = role === 'padByte' ? roleSets.bytePad : roleSets[role];
    target?.add(coordKey(module.row, module.column));
  });
  const codewords = [];
  for (let index = 0; index < traversal.length; index += 8) {
    const roles = bitRoles.slice(index, index + 8);
    codewords.push({
      kind: summarizeCodewordRoles(roles),
      modules: traversal.slice(index, index + 8),
      roles,
    });
  }
  const { ecLevelBits, maskBits } = getFormatBitGroups(
    qrDefinition.modules.size,
  );
  return {
    modeBits: roleSets.mode,
    charCountBits: roleSets.charCount,
    payloadBits: roleSets.payload,
    terminatorBits: roleSets.terminator,
    bytePadBits: roleSets.bytePad,
    errorCorrectionBits: roleSets.errorCorrection,
    remainderBits: roleSets.remainder,
    ecLevelBits,
    maskBits,
    bitRoles,
    fieldStarts,
    codewords,
    streamGroups: buildPostHeaderStreamGroups(traversal, bitRoles),
    encodingUnitGroups: buildEncodingUnitGroups(qrDefinition, traversal),
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
    ['errorCorrection', model.errorCorrectionBits],
    ['mode', model.modeBits],
    ['charCount', model.charCountBits],
    ['data', model.payloadBits],
    ['terminator', model.terminatorBits],
    ['padding', model.bytePadBits],
    ['remainder', model.remainderBits],
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
        codeword.kind === 'remainder' &&
        codeword.modules.some(
          (module) => module.row === row && module.column === column,
        ),
    )
  ) {
    return 'remainder';
  }
  return getModuleCategory(qrDefinition, row, column);
}
