import { getActiveLocale, lookup } from '../../../../i18n/index.js';

function shorten(value, maximumLength = 64) {
  const normalized = String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
  return normalized.length <= maximumLength
    ? normalized
    : `${normalized.slice(0, Math.max(0, maximumLength - 3)).trimEnd()}...`;
}

function shortText(value) {
  const normalized = String(value || '').trim();
  if (!normalized) return '';
  try {
    const url = new URL(normalized);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      const host = url.host.replace(/^www\./i, '');
      const path = url.pathname === '/' ? '' : url.pathname.replace(/\/$/, '');
      return shorten(`${host}${path}`);
    }
  } catch {
    // Plain text and incomplete URLs use a compact text label.
  }
  const domain = normalized.match(
    /^(?:https?:\/\/)?(?:www\.)?([^\s?#]+)(?:[?#].*)?$/i,
  );
  return shorten(domain ? domain[1].replace(/\/$/, '') : normalized);
}

function joinMessageLines(first, second) {
  if (first && second) return `${first}\n${second}`;
  return first || second || '';
}

function formatDate(value, includeYear = true) {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return '';
  return new Intl.DateTimeFormat(getActiveLocale(), {
    month: 'short',
    day: 'numeric',
    ...(includeYear ? { year: 'numeric' } : {}),
  }).format(new Date(year, month - 1, day, 12));
}

function formatTime(value) {
  if (!value) return '';
  const [hour, minute] = value.split(':').map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return '';
  return new Intl.DateTimeFormat(getActiveLocale(), {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(2000, 0, 1, hour, minute));
}

export function createFrameSection(options) {
  const getEventMessage = () => {
    const { event } = options;
    const startDate = formatDate(event.startDate.value);
    if (!startDate || !event.endDate.value)
      return shorten(event.title.value, 80);
    const sameDate = event.startDate.value === event.endDate.value;
    const sameYear =
      event.startDate.value.slice(0, 4) === event.endDate.value.slice(0, 4);
    const endDate = sameDate ? '' : formatDate(event.endDate.value);
    let schedule = sameDate
      ? startDate
      : `${formatDate(event.startDate.value, !sameYear)} - ${endDate}`;
    if (event.allDay.checked)
      schedule = `${schedule} | ${lookup('frame.allDay', 'All day')}`;
    else {
      const startTime = formatTime(event.startTime.value);
      const endTime = formatTime(event.endTime.value);
      schedule = sameDate
        ? `${schedule} | ${startTime} - ${endTime}`
        : `${formatDate(event.startDate.value, !sameYear)} ${startTime} - ${endDate} ${endTime}`;
    }
    return joinMessageLines(
      shorten(event.title.value, 80),
      shorten(schedule, 80),
    );
  };

  const getBulkMessage = (format) => {
    const row = options.getBulkRow();
    if (!row) return '';
    switch (format) {
      case 'url':
        return shortText(row.url);
      case 'text':
        return shortText(row.text);
      case 'number':
        return shorten(options.buildBulkText(row));
      case 'wifi':
        return row.ssid.trim()
          ? shorten(
              lookup('frame.wifi', 'Wi-Fi {ssid}', { ssid: row.ssid.trim() }),
            )
          : '';
      case 'email':
        return row.email.trim()
          ? shorten(
              lookup('frame.email', 'Email {email}', {
                email: row.email.trim(),
              }),
            )
          : '';
      case 'phone':
        return row.phone.trim()
          ? shorten(
              lookup('frame.call', 'Call {phone}', { phone: row.phone.trim() }),
            )
          : '';
      case 'sms':
        return row.phone.trim()
          ? shorten(
              lookup('frame.text', 'Text {phone}', { phone: row.phone.trim() }),
            )
          : '';
      case 'event': {
        const dates =
          row.start_date === row.end_date
            ? row.start_date
            : `${row.start_date} - ${row.end_date}`;
        const times = options.parseBoolean(row.all_day)
          ? lookup('frame.allDay', 'All day')
          : `${row.start_time} - ${row.end_time}`;
        return joinMessageLines(
          shorten(row.title, 80),
          shorten(`${dates} | ${times}`, 80),
        );
      }
      case 'geo':
        return shorten(
          lookup('frame.location', 'Location {location}', {
            location: row.label.trim() || `${row.latitude}, ${row.longitude}`,
          }),
        );
      case 'vcard':
        return shorten(
          lookup('frame.contact', 'Contact {contact}', {
            contact: row.name || row.organization || row.email,
          }),
        );
      default:
        return '';
    }
  };

  const getFileMessage = () => {
    const name = options.getActiveFile()?.name || '';
    if (!name || options.getFileMode() !== 'chunked') return shorten(name);
    const total = Math.max(1, Number.parseInt(options.fileIndex.max, 10) || 1);
    const current = Math.min(
      total,
      Math.max(1, Number.parseInt(options.fileIndex.value, 10) || 1),
    );
    const sequence = ` ${lookup('frame.sequence', '{current} of {total}', { current, total })}`;
    return `${shorten(name, Math.max(8, 64 - sequence.length))}${sequence}`;
  };

  const getAutomaticMessage = () => {
    const format = options.format.value;
    if (options.isBulkMode()) return getBulkMessage(format);
    const { values } = options;
    switch (format) {
      case 'url':
        return shortText(values.url.value);
      case 'text':
        return shortText(values.text.value);
      case 'number':
        return shorten(options.getNumberPayload());
      case 'wifi':
        return values.wifi.value
          ? shorten(
              lookup('frame.wifi', 'Wi-Fi {ssid}', { ssid: values.wifi.value }),
            )
          : '';
      case 'email':
        return values.email.value
          ? shorten(
              lookup('frame.email', 'Email {email}', {
                email: values.email.value,
              }),
            )
          : '';
      case 'phone':
        return values.phone.value
          ? shorten(
              lookup('frame.call', 'Call {phone}', {
                phone: values.phone.value,
              }),
            )
          : '';
      case 'sms':
        return values.sms.value
          ? shorten(
              lookup('frame.text', 'Text {phone}', { phone: values.sms.value }),
            )
          : '';
      case 'event':
        return getEventMessage();
      case 'geo': {
        const location =
          values.geoLabel.value ||
          (values.latitude.value && values.longitude.value
            ? `${values.latitude.value}, ${values.longitude.value}`
            : '');
        return location
          ? shorten(
              lookup('frame.location', 'Location {location}', { location }),
            )
          : '';
      }
      case 'vcard': {
        const contact =
          values.vcardName.value ||
          values.vcardOrg.value ||
          values.vcardEmail.value;
        return contact
          ? shorten(lookup('frame.contact', 'Contact {contact}', { contact }))
          : '';
      }
      case 'file':
        return getFileMessage();
      default:
        return '';
    }
  };

  const getMessage = () => {
    const custom = options.mode.value === 'custom';
    options.customField.hidden = !custom;
    if (options.mode.value === 'none') return '';
    return custom
      ? shorten(options.customMessage.value, 80)
      : getAutomaticMessage();
  };
  const setCentered = (enabled) => {
    options.centerCheckbox.checked = enabled;
    options.artCenterCheckbox.checked = enabled;
    if (enabled && options.artMode.value !== 'none') options.onDisableArtwork();
  };
  const getFont = (size) =>
    ({
      sans: `800 ${size}px "Avenir Next", "Segoe UI", sans-serif`,
      rounded: `800 ${size}px "Arial Rounded MT Bold", "Trebuchet MS", sans-serif`,
      serif: `700 ${size}px Georgia, "Times New Roman", serif`,
      mono: `700 ${size}px "SFMono-Regular", Consolas, "Liberation Mono", monospace`,
    })[options.font.value] ||
    `800 ${size}px "Avenir Next", "Segoe UI", sans-serif`;

  const sync = () => {
    options.customField.hidden = options.mode.value !== 'custom';
  };
  return { getMessage, setCentered, getFont, sync };
}
