import { normalizeModeName } from '../../modes.js';
import { lookup } from '../../../i18n/index.js';

function getInvalidCharacters(text, mode, encoder, alphanumericCharacters) {
  if (mode === 'byte') return [];
  if (mode === 'kanji') {
    const invalid = [];
    [...text].forEach((char, index) => {
      let shiftJisValue;
      try {
        shiftJisValue = encoder.toSJIS(char);
      } catch (error) {
        shiftJisValue = undefined;
      }
      const isQrKanji = Number.isInteger(shiftJisValue)
        && ((shiftJisValue >= 0x8140 && shiftJisValue <= 0x9ffc)
          || (shiftJisValue >= 0xe040 && shiftJisValue <= 0xebbf));
      if (!isQrKanji) invalid.push({ char, index });
    });
    return invalid;
  }

  const invalid = [];
  [...text].forEach((char, index) => {
    if (mode === 'numeric' && !/[0-9]/.test(char)) invalid.push({ char, index });
    if (mode === 'alphanumeric' && !alphanumericCharacters.includes(char)) invalid.push({ char, index });
  });
  return invalid;
}

export function createEncodingDiagnostics({
  encoder,
  modeLabels,
  alphanumericCharacters,
  elements,
  getCurrentMode,
  getFormat,
  getActiveFieldset,
  isBulkMode,
  buildDebugModel,
}) {
  const getModeLabel = (mode) => lookup(`encoding.modes.${mode}`, modeLabels[mode] ?? mode);
  const validationStates = {
    format: { message: '', level: 'error' },
    mode: { message: '', level: 'error' },
  };
  const syncSharedValidationState = () => {
    const states = Object.values(validationStates).filter(({ message }) => message);
    const hasError = states.some(({ level }) => level === 'error');
    const hasWarning = !hasError && states.some(({ level }) => level === 'warning');
    const { modeValidation, formatValidation, encodedPreview, bulkFields } = elements;
    const activeFieldset = getActiveFieldset(getFormat());
    encodedPreview.classList.toggle('has-error', hasError);
    activeFieldset?.classList.toggle('has-error', hasError);
    activeFieldset?.classList.toggle('has-warning', hasWarning);
    bulkFields.classList.toggle('has-error', isBulkMode() && hasError);
    bulkFields.classList.toggle('has-warning', isBulkMode() && hasWarning);
    modeValidation.classList.toggle('is-warning', validationStates.mode.level === 'warning');
    formatValidation.classList.toggle('is-warning', validationStates.format.level === 'warning');
  };
  const setFormatValidation = (message, invalidIndexes = [], level = 'error') => {
    const { formatValidation } = elements;
    validationStates.format = { message, level };
    formatValidation.hidden = !message;
    formatValidation.textContent = message;
    syncSharedValidationState();
  };
  const setModeValidation = (message, invalidIndexes = [], level = 'error') => {
    const { modeValidation } = elements;
    validationStates.mode = { message, level };
    modeValidation.hidden = !message;
    modeValidation.textContent = message;
    syncSharedValidationState();

    if (!message || !invalidIndexes.length) return;
    const shown = invalidIndexes.slice(0, 20).map((index) => index + 1).join(', ');
    const suffix = invalidIndexes.length > 20 ? ', ...' : '';
    modeValidation.textContent = lookup('encoding.invalidPositions', '{message} Positions: {positions}{suffix}.', {
      message, positions: shown, suffix,
    });
  };

  const validateManualMode = (encodedText) => {
    const mode = getCurrentMode();
    if (!mode || !encodedText) {
      setModeValidation('');
      return true;
    }
    if (mode === 'kanji' && typeof encoder.toSJIS !== 'function') {
      setModeValidation(lookup('encoding.kanjiUnavailable', 'Manual Kanji mode is unavailable because the Shift JIS conversion helper did not load.'));
      return false;
    }

    const invalid = getInvalidCharacters(encodedText, mode, encoder, alphanumericCharacters);
    if (!invalid.length) {
      setModeValidation('');
      return true;
    }
    const characters = [...new Set(invalid.map(({ char }) => JSON.stringify(char)))].join(', ');
    setModeValidation(
      lookup('encoding.incompatible', 'Incompatible with {mode} mode. Invalid characters: {characters}.', {
        mode: getModeLabel(mode), characters,
      }),
      invalid.map(({ index }) => index),
    );
    return false;
  };

  const updateSummary = (qrDefinition, options) => {
    const { detectedMode, segmentSummary, versionSummary, unusedSummary } = elements;
    if (!qrDefinition) {
      detectedMode.textContent = lookup('encoding.waiting', 'Waiting');
      segmentSummary.textContent = '0';
      versionSummary.textContent = lookup('common.auto', 'Auto');
      unusedSummary.textContent = '-';
      return;
    }

    const modes = qrDefinition.segments.map((segment) => normalizeModeName(segment.mode));
    const uniqueModes = [...new Set(modes)];
    const primaryMode = uniqueModes.length === 1 ? uniqueModes[0] : 'mixed';
    const correctionLevel = options.errorCorrectionLevel;
    const version = qrDefinition.version;
    detectedMode.textContent = primaryMode === 'mixed'
      ? lookup('encoding.mixedSummary', 'Mixed ({modes})', { modes: uniqueModes.map(getModeLabel).join(', ') })
      : getModeLabel(primaryMode);
    segmentSummary.textContent = String(qrDefinition.segments.length);
    versionSummary.textContent = `V${version}`;

    const dataCodewords = encoder.internals.getDataCodewords(version, correctionLevel);
    const debugModel = buildDebugModel(qrDefinition, options);
    const unusedBits = debugModel.bitRoles.filter(
      (role) => role === 'terminator' || role === 'bytePad' || role === 'padByte',
    ).length;
    const unusedPercent = dataCodewords > 0 ? Math.round((unusedBits / (dataCodewords * 8)) * 100) : 0;
    const unusedBytes = unusedBits / 8;
    const unusedByteLabel = Number.isInteger(unusedBytes) ? `${unusedBytes}` : unusedBytes.toFixed(1);
    unusedSummary.textContent = lookup('encoding.unused', '{bytes} B ({percent}%)', {
      bytes: unusedByteLabel, percent: unusedPercent,
    });
  };

  return { setValidation: setFormatValidation, validateManualMode, updateSummary };
}
