export function normalizePhoneNumber(value) {
  const trimmed = value.trim();
  if (!trimmed) return '';

  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return '';
  if (trimmed.startsWith('+')) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return `+${digits}`;
}

export function formatPhoneNumberForDisplay(value, format) {
  const normalized = normalizePhoneNumber(value);
  if (!normalized) return value.trim();

  const digits = normalized.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    const local = digits.slice(1);
    const area = local.slice(0, 3);
    const prefix = local.slice(3, 6);
    const line = local.slice(6, 10);
    if (format === 'usa') return `(${area}) ${prefix}-${line}`;
    if (format === 'international') return `+1 ${area}-${prefix}-${line}`;
  }

  if (format === 'digits') return digits;
  return normalized;
}
