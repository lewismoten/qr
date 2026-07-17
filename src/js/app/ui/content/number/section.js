function readSafeInteger(input) {
  const value = Number(input.value);
  return Number.isSafeInteger(value) ? value : null;
}

export function createNumberSection({
  startInput,
  endInput,
  stepInput,
  prefixInput,
  suffixInput,
  indexInput,
  statusElement,
  maxFrames,
  alphanumericCharacters,
  validatePrintableText,
}) {
  const getSequenceInfo = () => {
    const start = readSafeInteger(startInput);
    const end = readSafeInteger(endInput);
    const step = readSafeInteger(stepInput);
    if (start === null || end === null || step === null || step <= 0) {
      return { start, end, step, total: 1, current: 1, value: start ?? 0 };
    }

    const total = Math.floor(Math.abs(end - start) / step) + 1;
    const current = Math.min(total, Math.max(1, Number.parseInt(indexInput.value, 10) || 1));
    const direction = end >= start ? 1 : -1;
    return { start, end, step, total, current, value: start + direction * (current - 1) * step };
  };

  const getPayload = () => {
    const rawPayload = `${prefixInput.value}${getSequenceInfo().value}${suffixInput.value}`;
    const uppercasePayload = rawPayload.toUpperCase();
    return [...uppercasePayload].every((character) => alphanumericCharacters.includes(character))
      ? uppercasePayload
      : rawPayload;
  };

  const sync = () => {
    const { total, current, value } = getSequenceInfo();
    const safeTotal = Math.min(Math.max(total, 1), maxFrames);
    indexInput.max = String(safeTotal);
    indexInput.value = String(Math.min(current, safeTotal));
    statusElement.textContent = `${indexInput.value} / ${safeTotal} - ${value}`;
  };

  const getValidationState = () => {
    const { start, end, step, total } = getSequenceInfo();
    if (start === null) return { error: 'Not valid for Number format yet: start must be a whole number.', warning: '' };
    if (end === null) return { error: 'Not valid for Number format yet: end must be a whole number.', warning: '' };
    if (step === null || step <= 0) {
      return { error: 'Not valid for Number format yet: step must be a positive whole number.', warning: '' };
    }
    if (total > maxFrames) {
      return {
        error: `Not valid for Number format yet: the range creates ${total.toLocaleString()} QR codes; limit it to ${maxFrames.toLocaleString()} or fewer.`,
        warning: '',
      };
    }

    for (const [input, label] of [[prefixInput, 'prefix'], [suffixInput, 'suffix']]) {
      const error = validatePrintableText(input.value, {
        label: `Not valid for Number format yet: ${label}`,
        maxLength: 32,
      });
      if (error) return { error, warning: '' };
    }
    return { error: '', warning: '' };
  };

  return { getSequenceInfo, getPayload, sync, getValidationState };
}
