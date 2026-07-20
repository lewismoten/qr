import { lookup } from '../../../../i18n/index.js';

const MAXIMUM_QR_VERSION = 40;
const BITS_PER_BYTE = 8;
const MODE_INDICATOR_BITS = 4;
const VERSION_BUCKET_ONE_MAXIMUM = 9;
const VERSION_BUCKET_TWO_MAXIMUM = 26;
const VERSION_BUCKET = {
  low: 'low',
  medium: 'medium',
  high: 'high',
};
const CHARACTER_COUNT_BITS = {
  numeric: { low: 10, medium: 12, high: 14 },
  alphanumeric: { low: 9, medium: 11, high: 13 },
  byte: { low: 8, medium: 16, high: 16 },
  kanji: { low: 8, medium: 10, high: 12 },
};
const ALPHANUMERIC_PAIR_BITS = 11;
const ALPHANUMERIC_SINGLE_BITS = 6;
const ALPHANUMERIC_PAIR_CHARACTERS = 2;
const MAXIMUM_BYTE_MODE_CHARACTERS = 8191;

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
    const version = options.version ?? MAXIMUM_QR_VERSION;
    const capacityBits =
      encoder.internals.getDataCodewords(
        version,
        options.errorCorrectionLevel,
      ) * BITS_PER_BYTE;
    const getCountBits = (mode) => {
      const bucket =
        version <= VERSION_BUCKET_ONE_MAXIMUM
          ? VERSION_BUCKET.low
          : version <= VERSION_BUCKET_TWO_MAXIMUM
            ? VERSION_BUCKET.medium
            : VERSION_BUCKET.high;
      return CHARACTER_COUNT_BITS[mode][bucket];
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
          Math.floor(
            (capacityBits - MODE_INDICATOR_BITS - getCountBits('byte')) /
              BITS_PER_BYTE,
          ) - prefixBytes;
      }
    } else {
      const prefix = sampleText.slice(0, -1);
      const prefixBits = encoder.internals
        .optimizeSegments(prefix, version)
        .reduce(
          (total, segment) =>
            total +
            MODE_INDICATOR_BITS +
            getCountBits(segment.mode) +
            segment.getBitsLength(),
          0,
        );
      const availableBodyBits =
        capacityBits -
        prefixBits -
        MODE_INDICATOR_BITS -
        getCountBits('alphanumeric');
      if (availableBodyBits >= ALPHANUMERIC_SINGLE_BITS) {
        low =
          Math.floor(availableBodyBits / ALPHANUMERIC_PAIR_BITS) *
          ALPHANUMERIC_PAIR_CHARACTERS;
        if (
          availableBodyBits % ALPHANUMERIC_PAIR_BITS >=
          ALPHANUMERIC_SINGLE_BITS
        ) {
          low += 1;
        }
      }
    }
    low = Math.min(MAXIMUM_BYTE_MODE_CHARACTERS, Math.max(0, low));
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
