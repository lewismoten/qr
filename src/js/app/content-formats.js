import { normalizePhoneNumber } from './phone.js';

export function escapeWifiValue(value) {
  return String(value).replace(/([\\;,:"])/g, '\\$1');
}

export function serializeWifi({ security, ssid, password = '', hidden = false }) {
  const segments = [`T:${security}`, `S:${escapeWifiValue(String(ssid).trim())}`];
  if (security !== 'nopass') segments.push(`P:${escapeWifiValue(password)}`);
  if (hidden) segments.push('H:true');
  return `WIFI:${segments.join(';')};;`;
}

export function serializeEmail({ email, subject = '', body = '' }) {
  const params = new URLSearchParams();
  if (String(subject).trim()) params.set('subject', String(subject).trim());
  if (String(body).trim()) params.set('body', String(body).trim());
  const suffix = params.toString() ? `?${params}` : '';
  return `mailto:${String(email).trim()}${suffix}`;
}

export function serializePhone(number) {
  const normalized = normalizePhoneNumber(number);
  return normalized ? `tel:${normalized}` : '';
}

export function serializeSms({ number, message = '' }) {
  return `SMSTO:${normalizePhoneNumber(number)}:${message}`;
}

export function serializeGeo({ latitude, longitude, label = '' }) {
  const coordinates = `${String(latitude).trim()},${String(longitude).trim()}`;
  const normalizedLabel = String(label).trim();
  return normalizedLabel
    ? `geo:${coordinates}?q=${encodeURIComponent(normalizedLabel)}`
    : `geo:${coordinates}`;
}

export function serializeVCard({ name, organization = '', title = '', phone = '',
  email = '', url = '' }) {
  const lines = ['BEGIN:VCARD', 'VERSION:3.0', `FN:${String(name).trim()}`];
  const optionalFields = [
    ['ORG', organization], ['TITLE', title], ['TEL', phone], ['EMAIL', email], ['URL', url],
  ];
  optionalFields.forEach(([key, value]) => {
    if (String(value).trim()) lines.push(`${key}:${String(value).trim()}`);
  });
  lines.push('END:VCARD');
  return lines.join('\n');
}
