import { parseCoordinate } from './geo/section.js';
import { lookup } from '../../../i18n/index.js';
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
    label: lookup('fields.title', 'title'),
    maxLength: limits.calendarTitle,
  });
  if (titleError) return invalid(titleError);
  if (!e.eventStartDate.value)
    return invalid(
      lookup(
        'validation.event.startDate',
        'Not valid for Event format yet: start date is required.',
      ),
    );
  if (!e.eventEndDate.value)
    return invalid(
      lookup(
        'validation.event.endDate',
        'Not valid for Event format yet: end date is required.',
      ),
    );

  if (e.eventAllDay.checked) {
    if (e.eventEndDate.value < e.eventStartDate.value) {
      return invalid(
        lookup(
          'validation.event.dateOrder',
          'Not valid for Event format yet: end date cannot be before start date.',
        ),
      );
    }
  } else {
    if (!e.eventStartTime.value)
      return invalid(
        lookup(
          'validation.event.startTime',
          'Not valid for Event format yet: start time is required.',
        ),
      );
    if (!e.eventEndTime.value)
      return invalid(
        lookup(
          'validation.event.endTime',
          'Not valid for Event format yet: end time is required.',
        ),
      );
    if (
      `${e.eventEndDate.value}T${e.eventEndTime.value}` <=
      `${e.eventStartDate.value}T${e.eventStartTime.value}`
    ) {
      return invalid(
        lookup(
          'validation.event.timeOrder',
          'Not valid for Event format yet: end must be after start.',
        ),
      );
    }
  }

  const locationError = validateCalendarText(e.eventLocation.value, {
    label: lookup('fields.location', 'location'),
    maxLength: limits.calendarLocation,
  });
  if (locationError) return invalid(locationError);
  const descriptionError = validateCalendarText(e.eventDescription.value, {
    label: lookup('fields.description', 'description'),
    maxLength: limits.calendarDescription,
    multiline: true,
  });
  if (descriptionError) return invalid(descriptionError);
  return getWebsiteValidationState(e.eventUrl.value, {
    contextLabel: lookup('formats.event', 'Event'),
  });
}

function validateEmail(e, getEmailCapacity, limits) {
  const addressError = validateEmailValue(e.emailTo.value, {
    label: lookup('fields.recipientEmail', 'recipient email address'),
  });
  if (addressError) return invalid(addressError);
  const subjectError = validatePrintableText(e.emailSubject.value, {
    label: lookup(
      'validation.email.subjectLabel',
      'Not valid for Email format yet: subject',
    ),
    maxLength: limits.emailSubject,
  });
  if (subjectError) return invalid(subjectError);
  const capacity = getEmailCapacity();
  const bodyError = validatePrintableText(e.emailBody.value, {
    label: lookup(
      'validation.email.bodyLabel',
      'Not valid for Email format yet: body',
    ),
    maxLength: Math.max(capacity.max, 0),
  });
  if (bodyError) return invalid(bodyError);
  return capacity.current > capacity.max
    ? invalid(
        lookup(
          'validation.email.capacity',
          'Not valid for Email format yet: body exceeds the current QR capacity ({current} / {max}).',
          capacity,
        ),
      )
    : valid();
}

function validateGeo(e) {
  const latitudeText = e.geoLatitude.value.trim();
  const longitudeText = e.geoLongitude.value.trim();
  if (!latitudeText)
    return invalid(
      lookup(
        'validation.geo.latitudeRequired',
        'Not valid for Geo format yet: latitude is required.',
      ),
    );
  if (!longitudeText)
    return invalid(
      lookup(
        'validation.geo.longitudeRequired',
        'Not valid for Geo format yet: longitude is required.',
      ),
    );
  const latitude = parseCoordinate(latitudeText);
  const longitude = parseCoordinate(longitudeText);
  if (latitude === null)
    return invalid(
      lookup(
        'validation.geo.latitudeNumber',
        'Not valid for Geo format yet: latitude must be a valid number.',
      ),
    );
  if (longitude === null)
    return invalid(
      lookup(
        'validation.geo.longitudeNumber',
        'Not valid for Geo format yet: longitude must be a valid number.',
      ),
    );
  if (latitude < -90 || latitude > 90)
    return invalid(
      lookup(
        'validation.geo.latitudeRange',
        'Not valid for Geo format yet: latitude must be between -90 and 90.',
      ),
    );
  if (longitude < -180 || longitude > 180)
    return invalid(
      lookup(
        'validation.geo.longitudeRange',
        'Not valid for Geo format yet: longitude must be between -180 and 180.',
      ),
    );
  const labelError = validateGeoLabel(e.geoQuery.value);
  return labelError ? invalid(labelError) : valid();
}

function validateVCard(e) {
  const fields = [
    [
      e.vcardName,
      { required: true, label: lookup('fields.fullName', 'full name') },
    ],
    [e.vcardOrg, { label: lookup('fields.organization', 'organization') }],
    [e.vcardTitle, { label: lookup('fields.title', 'title') }],
  ];
  for (const [field, options] of fields) {
    const error = validateVCardTextValue(field.value, options);
    if (error) return invalid(error);
  }
  const phoneError = validateTelephoneValue(e.vcardPhone.value, {
    required: false,
    label: lookup('fields.vcardPhone', 'vCard phone number'),
    contextLabel: lookup('formats.vcard', 'vCard'),
  });
  if (phoneError) return invalid(phoneError);
  const emailError = validateEmailValue(e.vcardEmail.value, {
    required: false,
    label: lookup('fields.vcardEmail', 'vCard email address'),
    contextLabel: lookup('formats.vcard', 'vCard'),
  });
  if (emailError) return invalid(emailError);
  return getWebsiteValidationState(e.vcardUrl.value, {
    contextLabel: lookup('formats.vcard', 'vCard'),
  });
}

export function createFormatValidator({
  elements: e,
  bulk,
  numberSection,
  file,
  getEmailCapacity,
  limits,
}) {
  const getBulkState = () =>
    bulk.getValidationState({
      rowNumber: bulk.getFrameIndex() + 1,
      limits,
    });

  return function getValidationState() {
    if (bulk.isMode()) return getBulkState();
    const format = e.qrFormat.value;
    if (format === 'url')
      return getWebsiteValidationState(e.urlInput.value, {
        required: true,
        contextLabel: lookup('formats.url', 'URL'),
      });
    if (format === 'number') {
      const state = numberSection.getValidationState();
      if (state.error || state.warning) return state;
    }
    if (format === 'event') return validateEvent(e, limits);
    if (format === 'email') return validateEmail(e, getEmailCapacity, limits);
    if (format === 'geo') return validateGeo(e);
    if (format === 'vcard') return validateVCard(e);
    if (format === 'phone')
      return invalid(validateTelephoneValue(e.phoneNumber.value));
    if (format === 'sms') {
      const phoneError = validateTelephoneValue(e.smsNumber.value, {
        label: lookup('fields.smsPhone', 'SMS phone number'),
        contextLabel: lookup('formats.sms', 'SMS'),
      });
      if (phoneError) return invalid(phoneError);
      if (e.smsBody.value.length > limits.sms) {
        return invalid(
          lookup(
            'validation.sms.length',
            'Not valid for SMS format yet: message should stay at {maxLength} characters or fewer for broad SMS compatibility.',
            { maxLength: limits.sms },
          ),
        );
      }
    }
    if (format === 'file') {
      const activeFile = file.getActive();
      if (!activeFile)
        return invalid(
          lookup(
            'validation.file.required',
            'Not valid for File format yet: choose a file to encode.',
          ),
        );
      if (file.getMode() === 'blob') {
        return {
          error: '',
          warning: lookup(
            'validation.file.embeddedWarning',
            'Warning for File format: this shareable download URL embeds the file bytes directly, so larger files will hit QR capacity quickly.',
          ),
        };
      }
      if (file.getMode() === 'chunked') {
        const { totalChunks } = file.getCapacity(activeFile);
        return {
          error: '',
          warning:
            totalChunks > 1
              ? lookup(
                  'validation.file.chunksWarning',
                  'Warning for File format: this compact FILE stream is split across {totalChunks} QR codes. Each scan needs the same file ID plus every chunk to reconstruct the file.',
                  { totalChunks },
                )
              : '',
        };
      }
    }
    return valid();
  };
}
