const NORTH_AMERICAN_DIGITS = 10;
const COUNTRY_CODE_DIGITS = 11;
const AREA_CODE_END = 3;
const EXCHANGE_END = 6;

export function normalizePhoneNumber(value) {
  const trimmed = value.trim();
  if (!trimmed) return '';

  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return '';
  if (trimmed.startsWith('+')) return `+${digits}`;
  if (digits.length === NORTH_AMERICAN_DIGITS) return `+1${digits}`;
  if (digits.length === COUNTRY_CODE_DIGITS && digits.startsWith('1')) {
    return `+${digits}`;
  }
  return `+${digits}`;
}

export function formatPhoneNumberForDisplay(value, format) {
  const normalized = normalizePhoneNumber(value);
  if (!normalized) return value.trim();

  const digits = normalized.replace(/\D/g, '');
  if (digits.length === COUNTRY_CODE_DIGITS && digits.startsWith('1')) {
    const local = digits.slice(1);
    const area = local.slice(0, AREA_CODE_END);
    const prefix = local.slice(AREA_CODE_END, EXCHANGE_END);
    const line = local.slice(EXCHANGE_END, NORTH_AMERICAN_DIGITS);
    if (format === 'usa') return `(${area}) ${prefix}-${line}`;
    if (format === 'international') return `+1 ${area}-${prefix}-${line}`;
  }

  if (format === 'digits') return digits;
  return normalized;
}
