import { parseBoolean } from '../../../csv.js';
import {
  getWebsiteValidationState,
  isValidBulkDate,
  isValidBulkTime,
  validateCalendarText,
  validateEmailValue,
  validateGeoLabel,
  validatePrintableText,
  validateTelephoneValue,
  validateVCardTextValue,
} from '../../../validation.js';
import { parseCoordinate } from '../geo/section.js';
import { normalizeBulkWifiSecurity } from './payload.js';

export function validateBulkImport({ parseError, hasFile, row, rowNumber, schema, format, limits }) {
  if (parseError) return { error: `Not valid for Bulk Import yet: ${parseError}`, warning: '' };
  if (!hasFile) return { error: 'Not valid for Bulk Import yet: choose a CSV file.', warning: '' };
  if (!row) return { error: 'Not valid for Bulk Import yet: the CSV needs at least one data row.', warning: '' };

  const fail = (message) => ({ error: `Not valid for Bulk Import row ${rowNumber}: ${message}`, warning: '' });
  for (const field of schema.required) {
    if (!row[field].trim()) return fail(`${field} is required.`);
  }

  if (format === 'url') {
    const state = getWebsiteValidationState(row.url, { required: true, contextLabel: 'URL' });
    if (state.error) return fail(state.error.replace(/^Not valid for URL format yet:\s*/, ''));
    return state.warning ? { error: '', warning: `Bulk Import row ${rowNumber}: ${state.warning}` } : state;
  }
  if (format === 'text' && !row.text.trim()) return fail('text is required.');
  if (format === 'number') {
    if (!/^-?\d+$/.test(row.number.trim())) return fail('number must be a whole number.');
    for (const field of ['prefix', 'suffix']) {
      const error = validatePrintableText(row[field], { label: field, maxLength: 32 });
      if (error) return fail(error);
    }
  }
  if (format === 'wifi') {
    if (!normalizeBulkWifiSecurity(row.security)) return fail('security must be WPA, WEP, or open.');
    if (parseBoolean(row.hidden) === null) return fail('hidden must be true/false, yes/no, or 1/0.');
  }
  if (format === 'email') {
    const emailError = validateEmailValue(row.email, { label: 'email address' });
    if (emailError) return fail(emailError.replace(/^Not valid for Email format yet:\s*/, ''));
    const subjectError = validatePrintableText(row.subject, { label: 'subject', maxLength: limits.emailSubject });
    if (subjectError) return fail(subjectError);
    const bodyError = validatePrintableText(row.body, { label: 'body', maxLength: limits.byteCapacity });
    if (bodyError) return fail(bodyError);
  }
  if (format === 'phone' || format === 'sms') {
    const phoneError = validateTelephoneValue(row.phone);
    if (phoneError) return fail(phoneError.replace(/^Not valid for Phone format yet:\s*/, ''));
    if (format === 'sms') {
      const messageError = validatePrintableText(row.message, { label: 'message', maxLength: limits.sms });
      if (messageError) return fail(messageError);
    }
  }
  if (format === 'event') {
    const allDay = parseBoolean(row.all_day);
    if (allDay === null) return fail('all_day must be true/false, yes/no, or 1/0.');
    const titleError = validateCalendarText(row.title, { required: true, label: 'title', maxLength: limits.calendarTitle });
    if (titleError) return fail(titleError.replace(/^Not valid for Event format yet:\s*/, ''));
    if (!isValidBulkDate(row.start_date) || !isValidBulkDate(row.end_date)) {
      return fail('start_date and end_date must be real dates using YYYY-MM-DD.');
    }
    if (!allDay && (!isValidBulkTime(row.start_time) || !isValidBulkTime(row.end_time))) {
      return fail('start_time and end_time must be real 24-hour times using HH:MM unless all_day is true.');
    }
    const start = `${row.start_date}T${allDay ? '00:00' : row.start_time}`;
    const end = `${row.end_date}T${allDay ? '00:00' : row.end_time}`;
    if ((allDay && end < start) || (!allDay && end <= start)) return fail('the event end must be after its start.');
    const locationError = validateCalendarText(row.location, { label: 'location', maxLength: limits.calendarLocation });
    if (locationError) return fail(locationError.replace(/^Not valid for Event format yet:\s*/, ''));
    const descriptionError = validateCalendarText(row.description, {
      label: 'description',
      maxLength: limits.calendarDescription,
      multiline: true,
    });
    if (descriptionError) return fail(descriptionError.replace(/^Not valid for Event format yet:\s*/, ''));
    const urlState = getWebsiteValidationState(row.url, { contextLabel: 'Event' });
    if (urlState.error) return fail(urlState.error.replace(/^Not valid for Event format yet:\s*/, ''));
    if (urlState.warning) return { error: '', warning: `Bulk Import row ${rowNumber}: ${urlState.warning}` };
  }
  if (format === 'geo') {
    const latitude = parseCoordinate(row.latitude);
    const longitude = parseCoordinate(row.longitude);
    if (latitude === null || latitude < -90 || latitude > 90) return fail('latitude must be a number between -90 and 90.');
    if (longitude === null || longitude < -180 || longitude > 180) return fail('longitude must be a number between -180 and 180.');
    const labelError = validateGeoLabel(row.label);
    if (labelError) return fail(labelError.replace(/^Not valid for Geo format yet:\s*/, ''));
  }
  if (format === 'vcard') {
    for (const [field, label, required] of [
      ['name', 'full name', true],
      ['organization', 'organization', false],
      ['title', 'title', false],
    ]) {
      const error = validateVCardTextValue(row[field], { required, label });
      if (error) return fail(error.replace(/^Not valid for vCard format yet:\s*/, ''));
    }
    const phoneError = validateTelephoneValue(row.phone, { required: false });
    if (phoneError) return fail(phoneError.replace(/^Not valid for Phone format yet:\s*/, ''));
    const emailError = validateEmailValue(row.email, { required: false });
    if (emailError) return fail(emailError.replace(/^Not valid for Email format yet:\s*/, ''));
    const websiteState = getWebsiteValidationState(row.url, { contextLabel: 'vCard' });
    if (websiteState.error) return fail(websiteState.error.replace(/^Not valid for vCard format yet:\s*/, ''));
    if (websiteState.warning) return { error: '', warning: `Bulk Import row ${rowNumber}: ${websiteState.warning}` };
  }

  return { error: '', warning: '' };
}
