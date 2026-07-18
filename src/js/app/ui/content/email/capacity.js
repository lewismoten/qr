import { lookup } from '../../../../i18n/index.js';

export function createEmailCapacity({
  body,
  hint,
  encoder,
  buildOptions,
  buildPayload,
  buildEmail,
  isActive,
}) {
  let cachedKey = '';
  let cachedMax = 0;
  const getInfo = () => {
    const current = body.value.length;
    let options;
    try {
      options = buildOptions();
    } catch {
      return { current, max: 0 };
    }
    const emptyPayload = buildPayload(buildEmail(''));
    const cacheKey = JSON.stringify([options, emptyPayload]);
    if (cacheKey === cachedKey) return { current, max: cachedMax };
    const version = options.version ?? 40;
    const capacityBits =
      encoder.internals.getDataCodewords(
        version,
        options.errorCorrectionLevel,
      ) * 8;
    const getCountBits = (mode) => {
      const bucket = version <= 9 ? 0 : version <= 26 ? 1 : 2;
      return {
        numeric: [10, 12, 14],
        alphanumeric: [9, 11, 13],
        byte: [8, 16, 16],
        kanji: [8, 10, 12],
      }[mode][bucket];
    };
    const sampleText = buildEmail('A');
    const samplePayload = buildPayload(sampleText);
    let low = 0;
    if (Array.isArray(samplePayload)) {
      const [{ data = '', mode } = {}] = samplePayload;
      const selectedMode = typeof mode === 'string' ? mode : mode?.id;
      if (samplePayload.length === 1 && selectedMode === 'byte') {
        const prefixBytes = new TextEncoder().encode(
          String(data).slice(0, -1),
        ).length;
        low =
          Math.floor((capacityBits - 4 - getCountBits('byte')) / 8) -
          prefixBytes;
      }
    } else {
      const prefix = sampleText.slice(0, -1);
      const prefixBits = encoder.internals
        .optimizeSegments(prefix, version)
        .reduce(
          (total, segment) =>
            total + 4 + getCountBits(segment.mode) + segment.getBitsLength(),
          0,
        );
      const availableBodyBits =
        capacityBits - prefixBits - 4 - getCountBits('alphanumeric');
      if (availableBodyBits >= 6) {
        low = Math.floor(availableBodyBits / 11) * 2;
        if (availableBodyBits % 11 >= 6) low += 1;
      }
    }
    low = Math.min(8191, Math.max(0, low));
    cachedKey = cacheKey;
    cachedMax = low;
    return { current, max: low };
  };
  const sync = () => {
    if (!isActive()) return;
    const { current, max } = getInfo();
    hint.textContent = lookup('common.count', '{current} / {total}', {
      current,
      total: max,
    });
  };
  return { getInfo, sync };
}

export function createEmailCapacityFromDocument(document, options) {
  return createEmailCapacity({
    body: document.getElementById('email-body'),
    hint: document.getElementById('email-body-length-hint'),
    ...options,
  });
}
