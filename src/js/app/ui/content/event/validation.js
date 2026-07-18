import { lookup } from '../../../../i18n/index.js';
import {
  getWebsiteValidationState,
  isValidBulkDate,
  isValidBulkTime,
  validateCalendarText,
} from '../../../validation.js';

const invalid = (error) => ({ error, warning: '' });

export function validateEvent(document, limits) {
  const id = (name) => document.getElementById(name);
  const title = id('event-title');
  const allDay = id('event-all-day');
  const startDate = id('event-start-date');
  const startTime = id('event-start-time');
  const endDate = id('event-end-date');
  const endTime = id('event-end-time');
  const titleError = validateCalendarText(title.value, {
    required: true,
    label: lookup('fields.title', 'title'),
    maxLength: limits.calendarTitle,
  });
  if (titleError) return invalid(titleError);
  if (!startDate.value) {
    return invalid(
      lookup(
        'validation.event.startDate',
        'Not valid for Event format yet: start date is required.',
      ),
    );
  }
  if (!endDate.value) {
    return invalid(
      lookup(
        'validation.event.endDate',
        'Not valid for Event format yet: end date is required.',
      ),
    );
  }
  if (!isValidBulkDate(startDate.value) || !isValidBulkDate(endDate.value)) {
    return invalid(
      lookup(
        'validation.event.dates',
        'Not valid for Event format yet: enter real dates using YYYY-MM-DD.',
      ),
    );
  }
  if (allDay.checked && endDate.value < startDate.value) {
    return invalid(
      lookup(
        'validation.event.dateOrder',
        'Not valid for Event format yet: end date cannot be before start date.',
      ),
    );
  }
  if (!allDay.checked && (!startTime.value || !endTime.value)) {
    const key = !startTime.value ? 'startTime' : 'endTime';
    return invalid(
      lookup(
        `validation.event.${key}`,
        `Not valid for Event format yet: ${key} is required.`,
      ),
    );
  }
  if (
    !allDay.checked &&
    (!isValidBulkTime(startTime.value) || !isValidBulkTime(endTime.value))
  ) {
    return invalid(
      lookup(
        'validation.event.times',
        'Not valid for Event format yet: enter real 24-hour times using HH:MM.',
      ),
    );
  }
  if (
    !allDay.checked &&
    `${endDate.value}T${endTime.value}` <=
      `${startDate.value}T${startTime.value}`
  ) {
    return invalid(
      lookup(
        'validation.event.timeOrder',
        'Not valid for Event format yet: end must be after start.',
      ),
    );
  }
  for (const [name, label, maxLength, multiline] of [
    ['event-location', 'location', limits.calendarLocation, false],
    ['event-description', 'description', limits.calendarDescription, true],
  ]) {
    const error = validateCalendarText(id(name).value, {
      label: lookup(`fields.${label}`, label),
      maxLength,
      multiline,
    });
    if (error) return invalid(error);
  }
  return getWebsiteValidationState(id('event-url').value, {
    contextLabel: lookup('formats.event', 'Event'),
  });
}
