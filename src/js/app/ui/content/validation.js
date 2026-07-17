import { validateBulkImport } from './bulk/validation.js';
import { parseCoordinate } from './geo/section.js';
import {
  getWebsiteValidationState,
  validateCalendarText,
  validateEmailValue,
  validateGeoLabel,
  validatePrintableText,
  validateTelephoneValue,
  validateVCardTextValue,
} from '../../validation.js';

const valid = () => ({ error: '', warning: '' });
const invalid = (error) => ({ error, warning: '' });

function validateEvent(e, limits) {
  const titleError = validateCalendarText(e.eventTitle.value, {
    required: true,
    label: 'title',
    maxLength: limits.calendarTitle,
  });
  if (titleError) return invalid(titleError);
  if (!e.eventStartDate.value) return invalid('Not valid for Event format yet: start date is required.');
  if (!e.eventEndDate.value) return invalid('Not valid for Event format yet: end date is required.');

  if (e.eventAllDay.checked) {
    if (e.eventEndDate.value < e.eventStartDate.value) {
      return invalid('Not valid for Event format yet: end date cannot be before start date.');
    }
  } else {
    if (!e.eventStartTime.value) return invalid('Not valid for Event format yet: start time is required.');
    if (!e.eventEndTime.value) return invalid('Not valid for Event format yet: end time is required.');
    if (`${e.eventEndDate.value}T${e.eventEndTime.value}` <= `${e.eventStartDate.value}T${e.eventStartTime.value}`) {
      return invalid('Not valid for Event format yet: end must be after start.');
    }
  }

  const locationError = validateCalendarText(e.eventLocation.value, {
    label: 'location',
    maxLength: limits.calendarLocation,
  });
  if (locationError) return invalid(locationError);
  const descriptionError = validateCalendarText(e.eventDescription.value, {
    label: 'description',
    maxLength: limits.calendarDescription,
    multiline: true,
  });
  if (descriptionError) return invalid(descriptionError);
  return getWebsiteValidationState(e.eventUrl.value, { contextLabel: 'Event' });
}

function validateEmail(e, getEmailCapacity, limits) {
  const addressError = validateEmailValue(e.emailTo.value, { label: 'recipient email address' });
  if (addressError) return invalid(addressError);
  const subjectError = validatePrintableText(e.emailSubject.value, {
    label: 'Not valid for Email format yet: subject',
    maxLength: limits.emailSubject,
  });
  if (subjectError) return invalid(subjectError);
  const capacity = getEmailCapacity();
  const bodyError = validatePrintableText(e.emailBody.value, {
    label: 'Not valid for Email format yet: body',
    maxLength: Math.max(capacity.max, 0),
  });
  if (bodyError) return invalid(bodyError);
  return capacity.current > capacity.max
    ? invalid(`Not valid for Email format yet: body exceeds the current QR capacity (${capacity.current} / ${capacity.max}).`)
    : valid();
}

function validateGeo(e) {
  const latitudeText = e.geoLatitude.value.trim();
  const longitudeText = e.geoLongitude.value.trim();
  if (!latitudeText) return invalid('Not valid for Geo format yet: latitude is required.');
  if (!longitudeText) return invalid('Not valid for Geo format yet: longitude is required.');
  const latitude = parseCoordinate(latitudeText);
  const longitude = parseCoordinate(longitudeText);
  if (latitude === null) return invalid('Not valid for Geo format yet: latitude must be a valid number.');
  if (longitude === null) return invalid('Not valid for Geo format yet: longitude must be a valid number.');
  if (latitude < -90 || latitude > 90) return invalid('Not valid for Geo format yet: latitude must be between -90 and 90.');
  if (longitude < -180 || longitude > 180) return invalid('Not valid for Geo format yet: longitude must be between -180 and 180.');
  const labelError = validateGeoLabel(e.geoQuery.value);
  return labelError ? invalid(labelError) : valid();
}

function validateVCard(e) {
  const fields = [
    [e.vcardName, { required: true, label: 'full name' }],
    [e.vcardOrg, { label: 'organization' }],
    [e.vcardTitle, { label: 'title' }],
  ];
  for (const [field, options] of fields) {
    const error = validateVCardTextValue(field.value, options);
    if (error) return invalid(error);
  }
  const phoneError = validateTelephoneValue(e.vcardPhone.value, {
    required: false,
    label: 'vCard phone number',
  });
  if (phoneError) return invalid(phoneError.replace('Phone format', 'vCard format'));
  const emailError = validateEmailValue(e.vcardEmail.value, {
    required: false,
    label: 'vCard email address',
  });
  if (emailError) return invalid(emailError.replace('Email format', 'vCard format'));
  return getWebsiteValidationState(e.vcardUrl.value, { contextLabel: 'vCard' });
}

export function createFormatValidator({ elements: e, bulk, numberSection, file, getEmailCapacity, limits }) {
  const getBulkState = () => validateBulkImport({
    parseError: bulk.getError(),
    hasFile: Boolean(e.bulkFileInput.files?.[0]),
    row: bulk.getRow(),
    rowNumber: bulk.getFrameIndex() + 1,
    schema: bulk.getSchema(),
    format: e.qrFormat.value,
    limits,
  });

  return function getValidationState() {
    if (bulk.isMode()) return getBulkState();
    const format = e.qrFormat.value;
    if (format === 'url') return getWebsiteValidationState(e.urlInput.value, { required: true, contextLabel: 'URL' });
    if (format === 'number') {
      const state = numberSection.getValidationState();
      if (state.error || state.warning) return state;
    }
    if (format === 'event') return validateEvent(e, limits);
    if (format === 'email') return validateEmail(e, getEmailCapacity, limits);
    if (format === 'geo') return validateGeo(e);
    if (format === 'vcard') return validateVCard(e);
    if (format === 'phone') return invalid(validateTelephoneValue(e.phoneNumber.value));
    if (format === 'sms') {
      const phoneError = validateTelephoneValue(e.smsNumber.value, { label: 'SMS phone number' });
      if (phoneError) return invalid(phoneError.replace('Phone format', 'SMS format'));
      if (e.smsBody.value.length > limits.sms) {
        return invalid(`Not valid for SMS format yet: message should stay at ${limits.sms} characters or fewer for broad SMS compatibility.`);
      }
    }
    if (format === 'file') {
      const activeFile = file.getActive();
      if (!activeFile) return invalid('Not valid for File format yet: choose a file to encode.');
      if (file.getMode() === 'blob') {
        return { error: '', warning: 'Warning for File format: this shareable download URL embeds the file bytes directly, so larger files will hit QR capacity quickly.' };
      }
      if (file.getMode() === 'chunked') {
        const { totalChunks } = file.getCapacity(activeFile);
        return { error: '', warning: totalChunks > 1 ? `Warning for File format: this compact FILE stream is split across ${totalChunks} QR codes. Each scan needs the same file ID plus every chunk to reconstruct the file.` : '' };
      }
    }
    return valid();
  };
}
