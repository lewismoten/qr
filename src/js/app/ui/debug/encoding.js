function normalizeModeName(segmentMode) {
  if (!segmentMode) return 'byte';
  if (typeof segmentMode === 'string') return segmentMode.toLowerCase();
  if (typeof segmentMode.id === 'string') return segmentMode.id.toLowerCase();
  if (typeof segmentMode.name === 'string') return segmentMode.name.toLowerCase();
  return 'byte';
}

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
  modeCapacity,
  alphanumericCharacters,
  elements,
  getCurrentMode,
  getFormat,
  getActiveFieldset,
  isBulkMode,
  buildDebugModel,
}) {
  const setValidation = (message, invalidIndexes = [], level = 'error') => {
    const { modeValidation, formatValidation, encodedPreview, bulkFields } = elements;
    modeValidation.hidden = !message;
    modeValidation.textContent = message;
    formatValidation.hidden = !message;
    formatValidation.textContent = message;
    modeValidation.classList.toggle('is-warning', level === 'warning');
    formatValidation.classList.toggle('is-warning', level === 'warning');
    encodedPreview.classList.toggle('has-error', Boolean(message) && level === 'error');

    const activeFieldset = getActiveFieldset(getFormat());
    activeFieldset?.classList.toggle('has-error', Boolean(message) && level === 'error');
    activeFieldset?.classList.toggle('has-warning', Boolean(message) && level === 'warning');
    bulkFields.classList.toggle('has-error', isBulkMode() && Boolean(message) && level === 'error');
    bulkFields.classList.toggle('has-warning', isBulkMode() && Boolean(message) && level === 'warning');

    if (!message || !invalidIndexes.length) return;
    const shown = invalidIndexes.slice(0, 20).map((index) => index + 1).join(', ');
    const suffix = invalidIndexes.length > 20 ? ', ...' : '';
    modeValidation.textContent = `${message} Positions: ${shown}${suffix}.`;
  };

  const validateManualMode = (encodedText) => {
    const mode = getCurrentMode();
    if (!mode || !encodedText) {
      setValidation('');
      return true;
    }
    if (mode === 'kanji' && typeof encoder.toSJIS !== 'function') {
      setValidation('Manual Kanji mode is unavailable because the Shift JIS conversion helper did not load.');
      return false;
    }

    const invalid = getInvalidCharacters(encodedText, mode, encoder, alphanumericCharacters);
    if (!invalid.length) {
      setValidation('');
      return true;
    }
    const characters = [...new Set(invalid.map(({ char }) => JSON.stringify(char)))].join(', ');
    setValidation(
      `Incompatible with ${modeLabels[mode]} mode. Invalid characters: ${characters}.`,
      invalid.map(({ index }) => index),
    );
    return false;
  };

  const updateSummary = (qrDefinition, options) => {
    const { detectedMode, segmentSummary, versionSummary, capacitySummary, unusedSummary } = elements;
    if (!qrDefinition) {
      detectedMode.textContent = 'Waiting for content';
      segmentSummary.textContent = '0';
      versionSummary.textContent = 'Auto';
      capacitySummary.textContent = '-';
      unusedSummary.textContent = '-';
      return;
    }

    const modes = qrDefinition.segments.map((segment) => normalizeModeName(segment.mode));
    const uniqueModes = [...new Set(modes)];
    const primaryMode = uniqueModes.length === 1 ? uniqueModes[0] : 'mixed';
    const correctionLevel = options.errorCorrectionLevel;
    const version = qrDefinition.version;
    detectedMode.textContent = primaryMode === 'mixed'
      ? `Mixed (${uniqueModes.map((mode) => modeLabels[mode] ?? mode).join(', ')})`
      : modeLabels[primaryMode] ?? primaryMode;
    segmentSummary.textContent = String(qrDefinition.segments.length);
    versionSummary.textContent = `V${version}`;
    const capacity = modeCapacity[primaryMode]?.[correctionLevel];
    capacitySummary.textContent = primaryMode === 'mixed' ? 'Mixed mode' : capacity ? `${capacity} chars max` : '-';

    const dataCodewords = encoder.internals.getDataCodewords(version, correctionLevel);
    const debugModel = buildDebugModel(qrDefinition, options);
    const unusedBits = debugModel.bitRoles.filter(
      (role) => role === 'terminator' || role === 'bytePad' || role === 'padByte',
    ).length;
    const unusedPercent = dataCodewords > 0 ? Math.round((unusedBits / (dataCodewords * 8)) * 100) : 0;
    const unusedBytes = unusedBits / 8;
    const unusedByteLabel = Number.isInteger(unusedBytes) ? `${unusedBytes}` : unusedBytes.toFixed(1);
    unusedSummary.textContent = `${unusedByteLabel} B (${unusedPercent}%)`;
  };

  return { setValidation, validateManualMode, updateSummary };
}
