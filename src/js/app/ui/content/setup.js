import { createEventSection } from './event/section.js';
import { createGeoSection } from './geo/section.js';
import { createNumberSection } from './number/section.js';
import { createPhoneSection } from './phone/section.js';
import { createSharedFieldsSection } from './shared-fields.js';
import { createVCardSection } from './vcard/section.js';
import { createWifiSection } from './wifi/section.js';

export function createContentSections({ elements: e, runtime, limits, alphanumericCharacters, validatePrintableText }) {
  const event = createEventSection({
    title: e.eventTitle, allDay: e.eventAllDay, startDate: e.eventStartDate,
    startTime: e.eventStartTime, endDate: e.eventEndDate, endTime: e.eventEndTime,
    location: e.eventLocation, description: e.eventDescription, url: e.eventUrl,
    timeFields: e.eventTimeFields,
  });
  const geo = createGeoSection({
    latitudeInput: e.geoLatitude, longitudeInput: e.geoLongitude, labelInput: e.geoQuery,
    mapElement: e.geoMapElement, isActive: () => e.format.value === 'geo',
    onChange: () => runtime.render(),
  });
  const phone = createPhoneSection({
    buttons: e.phoneFormatButtons,
    inputs: [e.phoneNumber, e.smsNumber, e.vcardPhone],
    onChange: () => runtime.render(),
  });
  const number = createNumberSection({
    startInput: e.numberStart, endInput: e.numberEnd, stepInput: e.numberStep,
    prefixInput: e.numberPrefix, suffixInput: e.numberSuffix,
    indexInput: e.numberSequenceIndex, statusElement: e.numberSequenceValue,
    maxFrames: limits.numberFrames, alphanumericCharacters, validatePrintableText,
  });
  const wifi = createWifiSection({
    ssid: e.wifiSsid, password: e.wifiPassword, encryption: e.wifiEncryption,
    hidden: e.wifiHidden, revealSecrets: e.payloadRevealSecrets,
    onChange() {
      runtime.syncChoices();
      runtime.render();
    },
  });
  const shared = createSharedFieldsSection({
    emailInputs: [e.emailTo, e.vcardEmail],
    messageInputs: [e.textInput, e.smsBody, e.emailBody],
    emailSubject: e.emailSubject,
    onMessageChange() {
      runtime.syncSmsLength();
      runtime.syncEmailLength();
    },
  });
  const vcard = createVCardSection({
    name: e.vcardName, organization: e.vcardOrg, title: e.vcardTitle,
    phone: e.vcardPhone, email: e.vcardEmail, website: e.vcardUrl,
  });
  return { event, geo, phone, number, wifi, shared, vcard };
}
