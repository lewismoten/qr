import { lookup } from '../../../../../i18n/index.js';

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
  alphaChars,
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
    const current = Math.min(
      total,
      Math.max(1, Number.parseInt(indexInput.value, 10) || 1),
    );
    const direction = end >= start ? 1 : -1;
    return {
      start,
      end,
      step,
      total,
      current,
      value: start + direction * (current - 1) * step,
    };
  };

  const getPayload = () => {
    const rawPayload = `${prefixInput.value}${getSequenceInfo().value}${suffixInput.value}`;
    const uppercasePayload = rawPayload.toUpperCase();
    return [...uppercasePayload].every((character) =>
      alphaChars.includes(character),
    )
      ? uppercasePayload
      : rawPayload;
  };

  const sync = () => {
    const { total, current, value } = getSequenceInfo();
    const safeTotal = Math.min(Math.max(total, 1), maxFrames);
    indexInput.max = String(safeTotal);
    indexInput.value = String(Math.min(current, safeTotal));
    statusElement.textContent = lookup(
      'number.status',
      '{current} / {total} - {value}',
      {
        current: indexInput.value,
        total: safeTotal,
        value,
      },
    );
  };

  const getValidation = () => {
    const { start, end, step, total } = getSequenceInfo();
    if (start === null)
      return {
        error: lookup(
          'validation.number.start',
          'Not valid for Number format yet: start must be a whole number.',
        ),
        warning: '',
      };
    if (end === null)
      return {
        error: lookup(
          'validation.number.end',
          'Not valid for Number format yet: end must be a whole number.',
        ),
        warning: '',
      };
    if (step === null || step <= 0) {
      return {
        error: lookup(
          'validation.number.step',
          'Not valid for Number format yet: step must be a positive whole number.',
        ),
        warning: '',
      };
    }
    if (total > maxFrames) {
      return {
        error: lookup(
          'validation.number.range',
          'Not valid for Number format yet: the range creates {total} QR codes; limit it to {maxFrames} or fewer.',
          {
            total: total.toLocaleString(),
            maxFrames: maxFrames.toLocaleString(),
          },
        ),
        warning: '',
      };
    }

    for (const [input, label] of [
      [prefixInput, lookup('fields.prefix', 'prefix')],
      [suffixInput, lookup('fields.suffix', 'suffix')],
    ]) {
      const error = validatePrintableText(input.value, {
        label: lookup(
          'validation.number.fieldLabel',
          'Not valid for Number format yet: {label}',
          { label },
        ),
        maxLength: 32,
      });
      if (error) return { error, warning: '' };
    }
    return { error: '', warning: '' };
  };

  return {
    getSequenceInfo,
    getPayload,
    getIndexInput: () => indexInput,
    sync,
    getValidation,
  };
}

export function createNumberSectionFromDocument(document, options) {
  return createNumberSection({
    startInput: document.getElementById('number-start'),
    endInput: document.getElementById('number-end'),
    stepInput: document.getElementById('number-step'),
    prefixInput: document.getElementById('number-prefix'),
    suffixInput: document.getElementById('number-suffix'),
    indexInput: document.getElementById('number-sequence-index'),
    statusElement: document.getElementById('number-sequence-value'),
    ...options,
  });
}
