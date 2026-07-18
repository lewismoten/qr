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
import { parseCoordinate } from '../geo/coordinates.js';
import { validateWifiValues } from '../wifi/validation.js';
import { normalizeBulkWifiSecurity } from './payload.js';
import { lookup } from '../../../../i18n/index.js';

const detail = (message) =>
  message.includes(': ') ? message.slice(message.indexOf(': ') + 2) : message;

export function validateBulkImport({
  parseError,
  hasFile,
  row,
  rowNumber,
  schema,
  format,
  limits,
}) {
  if (parseError)
    return {
      error: lookup(
        'bulk.validation.parse',
        'Not valid for Bulk Import yet: {message}',
        { message: parseError },
      ),
      warning: '',
    };
  if (!hasFile)
    return {
      error: lookup(
        'bulk.validation.fileRequired',
        'Not valid for Bulk Import yet: choose a CSV file.',
      ),
      warning: '',
    };
  if (!row)
    return {
      error: lookup(
        'bulk.validation.rowRequired',
        'Not valid for Bulk Import yet: the CSV needs at least one data row.',
      ),
      warning: '',
    };

  const fail = (message) => ({
    error: lookup(
      'bulk.validation.row',
      'Not valid for Bulk Import row {rowNumber}: {message}',
      { rowNumber, message },
    ),
    warning: '',
  });
  for (const field of schema.required) {
    if (!row[field].trim())
      return fail(
        lookup('bulk.validation.fieldRequired', '{field} is required.', {
          field,
        }),
      );
  }

  if (format === 'url') {
    const state = getWebsiteValidationState(row.url, {
      required: true,
      contextLabel: lookup('formats.url', 'URL'),
    });
    if (state.error) return fail(detail(state.error));
    return state.warning
      ? {
          error: '',
          warning: lookup(
            'bulk.warning',
            'Bulk Import row {rowNumber}: {message}',
            { rowNumber, message: state.warning },
          ),
        }
      : state;
  }
  if (format === 'text' && !row.text.trim())
    return fail(lookup('bulk.validation.textRequired', 'text is required.'));
  if (format === 'number') {
    if (!Number.isSafeInteger(Number(row.number.trim())))
      return fail(
        lookup('bulk.validation.wholeNumber', 'number must be a whole number.'),
      );
    for (const field of ['prefix', 'suffix']) {
      const error = validatePrintableText(row[field], {
        label: lookup(`fields.${field}`, field),
        maxLength: 32,
      });
      if (error) return fail(error);
    }
  }
  if (format === 'wifi') {
    const security = normalizeBulkWifiSecurity(row.security);
    if (!security)
      return fail(
        lookup(
          'bulk.validation.security',
          'security must be WPA, WEP, or open.',
        ),
      );
    if (parseBoolean(row.hidden) === null)
      return fail(
        lookup(
          'bulk.validation.booleanHidden',
          'hidden must be true/false, yes/no, or 1/0.',
        ),
      );
    const wifiError = validateWifiValues({
      security,
      ssid: row.ssid,
      password: row.password,
    });
    if (wifiError) return fail(detail(wifiError));
  }
  if (format === 'email') {
    const emailError = validateEmailValue(row.email);
    if (emailError) return fail(detail(emailError));
    const subjectError = validatePrintableText(row.subject, {
      label: lookup('fields.subject', 'subject'),
      maxLength: limits.emailSubject,
    });
    if (subjectError) return fail(subjectError);
    const bodyError = validatePrintableText(row.body, {
      label: lookup('fields.body', 'body'),
      maxLength: limits.byteCapacity,
    });
    if (bodyError) return fail(bodyError);
  }
  if (format === 'phone' || format === 'sms') {
    const phoneError = validateTelephoneValue(row.phone);
    if (phoneError) return fail(detail(phoneError));
    if (format === 'sms') {
      const messageError = validatePrintableText(row.message, {
        label: lookup('fields.message', 'message'),
        maxLength: limits.sms,
      });
      if (messageError) return fail(messageError);
    }
  }
  if (format === 'event') {
    const allDay = parseBoolean(row.all_day);
    if (allDay === null)
      return fail(
        lookup(
          'bulk.validation.booleanAllDay',
          'all_day must be true/false, yes/no, or 1/0.',
        ),
      );
    const titleError = validateCalendarText(row.title, {
      required: true,
      label: lookup('fields.title', 'title'),
      maxLength: limits.calendarTitle,
    });
    if (titleError) return fail(detail(titleError));
    if (!isValidBulkDate(row.start_date) || !isValidBulkDate(row.end_date)) {
      return fail(
        lookup(
          'bulk.validation.dates',
          'start_date and end_date must be real dates using YYYY-MM-DD.',
        ),
      );
    }
    if (
      !allDay &&
      (!isValidBulkTime(row.start_time) || !isValidBulkTime(row.end_time))
    ) {
      return fail(
        lookup(
          'bulk.validation.times',
          'start_time and end_time must be real 24-hour times using HH:MM unless all_day is true.',
        ),
      );
    }
    const start = `${row.start_date}T${allDay ? '00:00' : row.start_time}`;
    const end = `${row.end_date}T${allDay ? '00:00' : row.end_time}`;
    if ((allDay && end < start) || (!allDay && end <= start))
      return fail(
        lookup(
          'bulk.validation.eventOrder',
          'the event end must be after its start.',
        ),
      );
    const locationError = validateCalendarText(row.location, {
      label: lookup('fields.location', 'location'),
      maxLength: limits.calendarLocation,
    });
    if (locationError) return fail(detail(locationError));
    const descriptionError = validateCalendarText(row.description, {
      label: lookup('fields.description', 'description'),
      maxLength: limits.calendarDescription,
      multiline: true,
    });
    if (descriptionError) return fail(detail(descriptionError));
    const urlState = getWebsiteValidationState(row.url, {
      contextLabel: lookup('formats.event', 'Event'),
    });
    if (urlState.error) return fail(detail(urlState.error));
    if (urlState.warning)
      return {
        error: '',
        warning: lookup(
          'bulk.warning',
          'Bulk Import row {rowNumber}: {message}',
          { rowNumber, message: urlState.warning },
        ),
      };
  }
  if (format === 'geo') {
    const latitude = parseCoordinate(row.latitude);
    const longitude = parseCoordinate(row.longitude);
    if (latitude === null || latitude < -90 || latitude > 90)
      return fail(
        lookup(
          'bulk.validation.latitude',
          'latitude must be a number between -90 and 90.',
        ),
      );
    if (longitude === null || longitude < -180 || longitude > 180)
      return fail(
        lookup(
          'bulk.validation.longitude',
          'longitude must be a number between -180 and 180.',
        ),
      );
    const labelError = validateGeoLabel(row.label);
    if (labelError) return fail(detail(labelError));
  }
  if (format === 'vcard') {
    for (const [field, label, required] of [
      ['name', lookup('fields.fullName', 'full name'), true],
      ['organization', lookup('fields.organization', 'organization'), false],
      ['title', lookup('fields.title', 'title'), false],
    ]) {
      const error = validateVCardTextValue(row[field], { required, label });
      if (error) return fail(detail(error));
    }
    const phoneError = validateTelephoneValue(row.phone, { required: false });
    if (phoneError) return fail(detail(phoneError));
    const emailError = validateEmailValue(row.email, { required: false });
    if (emailError) return fail(detail(emailError));
    const websiteState = getWebsiteValidationState(row.url, {
      contextLabel: lookup('formats.vcard', 'vCard'),
    });
    if (websiteState.error) return fail(detail(websiteState.error));
    if (websiteState.warning)
      return {
        error: '',
        warning: lookup(
          'bulk.warning',
          'Bulk Import row {rowNumber}: {message}',
          { rowNumber, message: websiteState.warning },
        ),
      };
  }

  return { error: '', warning: '' };
}
