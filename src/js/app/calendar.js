const eventUid = `${typeof globalThis.crypto?.randomUUID === 'function'
  ? globalThis.crypto.randomUUID()
  : `${Date.now()}-${Math.random().toString(36).slice(2)}`}@qr.lewismoten.com`;
const eventTimestamp = new Date();

export function formatCalendarInputDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatCalendarInputTime(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function formatDate(value) {
  return value.replaceAll('-', '');
}

function formatDateTime(dateValue, timeValue) {
  return `${formatDate(dateValue)}T${timeValue.replace(':', '')}00`;
}

function formatUtcDateTime(date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function addDays(dateValue, days) {
  const [year, month, day] = dateValue.split('-').map(Number);
  return formatCalendarInputDate(new Date(year, month - 1, day + days));
}

function escapeText(value) {
  return value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

export function createCalendarEventId(suffix = '') {
  if (!suffix) return eventUid;
  return `${eventUid.replace('@qr.lewismoten.com', '')}-${suffix}@qr.lewismoten.com`;
}

export function serializeCalendarEvent(values, uid = eventUid) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Lewis Moten//QR Code Generator//EN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatUtcDateTime(eventTimestamp)}`,
    `SUMMARY:${escapeText(values.title.trim())}`,
  ];

  if (values.allDay) {
    lines.push(`DTSTART;VALUE=DATE:${formatDate(values.startDate)}`);
    lines.push(`DTEND;VALUE=DATE:${formatDate(addDays(values.endDate, 1))}`);
  } else {
    lines.push(`DTSTART:${formatDateTime(values.startDate, values.startTime)}`);
    lines.push(`DTEND:${formatDateTime(values.endDate, values.endTime)}`);
  }
  if (values.location.trim()) lines.push(`LOCATION:${escapeText(values.location.trim())}`);
  if (values.description.trim()) lines.push(`DESCRIPTION:${escapeText(values.description.trim())}`);
  if (values.url.trim()) lines.push(`URL:${values.url.trim()}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return lines.join('\r\n');
}
