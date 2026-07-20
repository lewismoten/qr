import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  readLocaleSource,
  readSourceLocaleManifest,
} from '../../helpers/locales.js';

// These values are machine syntax or input examples, not prose-owned limits.
const ALLOWED_NUMERIC_KEYS = new Set([
  'bulk.validation.booleanAllDay',
  'bulk.validation.booleanHidden',
  'bulk.validation.times',
  'debugUi.encoding.alphanumericShort',
  'debugUi.overlay.unitsHelp',
  'form.data.e164',
  'form.data.fileProtocolHint',
  'form.data.wpa',
  'form.data.wpaLong',
  'form.defaults.phone',
  'form.placeholders.phone',
  'preview.actualRatio',
  'validation.event.times',
]);

const PLACEHOLDER_PATTERN = /\{[A-Za-z][\w.-]*\}/gu;
const NUMBER_PATTERN = /\p{Number}/u;
const DATE_PATTERN = /\b\d{4}[-/]\d{1,2}[-/]\d{1,2}\b/u;

function flattenMessages(value, prefix = '', output = {}) {
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === 'object' && !Array.isArray(child)) {
      flattenMessages(child, path, output);
    } else if (typeof child === 'string') {
      output[path] = child;
    }
  }
  return output;
}

function getCalendarNames(locale) {
  const names = new Set();
  const month = new Intl.DateTimeFormat(locale, { month: 'long' });
  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'long' });
  for (let index = 0; index < 12; index += 1) {
    names.add(month.format(new Date(Date.UTC(2024, index, 1))));
  }
  for (let index = 1; index <= 7; index += 1) {
    names.add(weekday.format(new Date(Date.UTC(2024, 0, index))));
  }
  return [...names].filter(Boolean);
}

function containsCalendarName(text, names) {
  const lower = text.toLocaleLowerCase();
  return names.some((name) => {
    const candidate = name.toLocaleLowerCase();
    const index = lower.indexOf(candidate);
    if (index < 0) return false;
    const before = lower[index - 1];
    const after = lower[index + candidate.length];
    return (
      (!before || !/\p{Letter}/u.test(before)) &&
      (!after || !/\p{Letter}/u.test(after))
    );
  });
}

function removeTechnicalIdentifiers(message) {
  return message.replaceAll('MP4', '').replaceAll('UTF-8', '');
}

test('locale prose receives numbers and calendar values as tags', async () => {
  const manifest = await readSourceLocaleManifest();
  const issues = [];

  for (const locale of manifest.locales.filter((entry) => !entry.debug)) {
    const messages = flattenMessages(await readLocaleSource(locale.code));
    const calendarNames = getCalendarNames(locale.code);
    for (const [key, message] of Object.entries(messages)) {
      if (ALLOWED_NUMERIC_KEYS.has(key)) continue;
      const literal = removeTechnicalIdentifiers(
        message.replaceAll(PLACEHOLDER_PATTERN, ''),
      );
      if (NUMBER_PATTERN.test(literal)) {
        issues.push(`${locale.code}.${key}: numeric literal in "${message}"`);
      }
      if (
        DATE_PATTERN.test(literal) ||
        containsCalendarName(literal, calendarNames)
      ) {
        issues.push(`${locale.code}.${key}: calendar literal in "${message}"`);
      }
    }
  }

  assert.deepEqual(
    issues,
    [],
    'Pass numeric and calendar-dependent values as interpolation tags',
  );
});
