const DATE_OPTIONS = Object.freeze({
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
  year: 'numeric',
});

function parseIsoDate(value) {
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const dateTime = /^\d{4}-\d{2}-\d{2}T[\d:.+-]+Z?$/.test(value);
  if (!dateOnly && !dateTime) return null;
  const date = new Date(dateOnly ? `${value}T00:00:00Z` : value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatLocalizedDate(value, locale) {
  const date = parseIsoDate(value);
  if (!date) return value;
  return new Intl.DateTimeFormat(locale, DATE_OPTIONS).format(date);
}

export function localizeDates(document, locale) {
  document.querySelectorAll('time[data-localized-date]').forEach((element) => {
    const value = element.getAttribute('datetime') || '';
    element.textContent = formatLocalizedDate(value, locale);
  });
}
