import {
  createCalendarEventId,
  serializeCalendarEvent,
} from '../../../data/calendar.js';
import {
  serializeEmail,
  serializeGeo,
  serializePhone,
  serializeSms,
  serializeVCard,
  serializeWifi,
} from '../../../data/content-formats.js';
import { parseBoolean } from '../../../data/csv.js';

export function normalizeBulkWifiSecurity(value) {
  const normalized = String(value).trim().toLowerCase();
  if (['wpa', 'wpa2', 'wpa3', 'wpa/2/3'].includes(normalized)) return 'WPA';
  if (normalized === 'wep') return 'WEP';
  if (['open', 'none', 'nopass'].includes(normalized)) return 'nopass';
  return '';
}

export function serializeBulkRow({ row, format, frameIndex, alphaChars }) {
  if (!row) return '';

  switch (format) {
    case 'url':
      return row.url.trim();
    case 'text':
      return row.text;
    case 'number': {
      const raw = `${row.prefix}${row.number}${row.suffix}`;
      const uppercase = raw.toUpperCase();
      return [...uppercase].every((character) => alphaChars.includes(character))
        ? uppercase
        : raw;
    }
    case 'wifi': {
      const security =
        normalizeBulkWifiSecurity(row.security) || row.security.trim();
      return serializeWifi({
        security,
        ssid: row.ssid,
        password: row.password,
        hidden: parseBoolean(row.hidden),
      });
    }
    case 'email':
      return serializeEmail({
        email: row.email,
        subject: row.subject,
        body: row.body,
      });
    case 'phone':
      return serializePhone(row.phone);
    case 'sms':
      return serializeSms({ number: row.phone, message: row.message });
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
    case 'geo':
      return serializeGeo({
        latitude: row.latitude,
        longitude: row.longitude,
        label: row.label,
      });
    case 'vcard':
      return serializeVCard({
        name: row.name,
        organization: row.organization,
        title: row.title,
        phone: row.phone,
        email: row.email,
        url: row.url,
      });
    default:
      return '';
  }
}
