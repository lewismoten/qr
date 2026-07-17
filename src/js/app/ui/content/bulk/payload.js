import { createCalendarEventId, serializeCalendarEvent } from '../../../calendar.js';
import { parseBoolean } from '../../../csv.js';
import { normalizePhoneNumber } from '../../../phone.js';
import { escapeWifiValue } from '../wifi/section.js';

export function normalizeBulkWifiSecurity(value) {
  const normalized = String(value).trim().toLowerCase();
  if (['wpa', 'wpa2', 'wpa3', 'wpa/2/3'].includes(normalized)) return 'WPA';
  if (normalized === 'wep') return 'WEP';
  if (['open', 'none', 'nopass'].includes(normalized)) return 'nopass';
  return '';
}

export function serializeBulkRow({ row, format, frameIndex, alphanumericCharacters }) {
  if (!row) return '';

  switch (format) {
    case 'url':
      return row.url.trim();
    case 'text':
      return row.text;
    case 'number': {
      const raw = `${row.prefix}${row.number}${row.suffix}`;
      const uppercase = raw.toUpperCase();
      return [...uppercase].every((character) => alphanumericCharacters.includes(character)) ? uppercase : raw;
    }
    case 'wifi': {
      const security = normalizeBulkWifiSecurity(row.security) || row.security.trim();
      const segments = [`T:${security}`, `S:${escapeWifiValue(row.ssid.trim())}`];
      if (security !== 'nopass') segments.push(`P:${escapeWifiValue(row.password)}`);
      if (parseBoolean(row.hidden)) segments.push('H:true');
      return `WIFI:${segments.join(';')};;`;
    }
    case 'email': {
      const params = new URLSearchParams();
      if (row.subject.trim()) params.set('subject', row.subject.trim());
      if (row.body.trim()) params.set('body', row.body.trim());
      return `mailto:${row.email.trim()}${params.toString() ? `?${params}` : ''}`;
    }
    case 'phone': {
      const phone = normalizePhoneNumber(row.phone);
      return phone ? `tel:${phone}` : '';
    }
    case 'sms':
      return `SMSTO:${normalizePhoneNumber(row.phone)}:${row.message}`;
    case 'event':
      return serializeCalendarEvent(
        {
          title: row.title,
          allDay: Boolean(parseBoolean(row.all_day)),
          startDate: row.start_date.trim(),
          startTime: row.start_time.trim(),
          endDate: row.end_date.trim(),
          endTime: row.end_time.trim(),
          location: row.location,
          description: row.description,
          url: row.url,
        },
        createCalendarEventId(frameIndex),
      );
    case 'geo': {
      const coordinates = `${row.latitude.trim()},${row.longitude.trim()}`;
      return row.label.trim() ? `geo:${coordinates}?q=${encodeURIComponent(row.label.trim())}` : `geo:${coordinates}`;
    }
    case 'vcard': {
      const lines = ['BEGIN:VCARD', 'VERSION:3.0', `FN:${row.name.trim()}`];
      if (row.organization.trim()) lines.push(`ORG:${row.organization.trim()}`);
      if (row.title.trim()) lines.push(`TITLE:${row.title.trim()}`);
      if (row.phone.trim()) lines.push(`TEL:${row.phone.trim()}`);
      if (row.email.trim()) lines.push(`EMAIL:${row.email.trim()}`);
      if (row.url.trim()) lines.push(`URL:${row.url.trim()}`);
      lines.push('END:VCARD');
      return lines.join('\n');
    }
    default:
      return '';
  }
}
