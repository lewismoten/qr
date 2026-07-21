import { lookup } from '../../../../i18n/index.js';
import { createFrameSection } from './frame-content-section.js';

export function createFrameSectionFromDocument(document, options) {
  const id = (name) => document.getElementById(name);
  const deferredControl = (name, fallback) => ({
    get checked() {
      return id(name)?.checked ?? fallback;
    },
    set checked(value) {
      const control = id(name);
      if (control) control.checked = value;
    },
    get value() {
      return id(name)?.value ?? fallback;
    },
    set value(value) {
      const control = id(name);
      if (control) control.value = value;
    },
  });
  const lineHeight = id('frame-line-height');
  const lineHeightValue = id('frame-line-height-value');
  const section = createFrameSection({
    ...options,
    mode: id('frame-message-mode'),
    customField: id('custom-frame-message-field'),
    customMessage: id('custom-frame-message'),
    centerCheckbox: id('frame-message-center'),
    artCenterToggle: deferredControl('frame-message-center-art', false),
    artMode: deferredControl('center-art-mode', 'none'),
    font: id('frame-font'),
    lineHeight,
    color: id('frame-message-color'),
    fileIndex: id('file-chunk-index'),
    values: {
      url: id('url-input'),
      text: id('text-input'),
      wifi: id('wifi-ssid'),
      email: id('email-to'),
      phone: id('phone-number'),
      sms: id('sms-number'),
      geoLabel: id('geo-query'),
      latitude: id('geo-latitude'),
      longitude: id('geo-longitude'),
      vcardName: id('vcard-name'),
      vcardOrg: id('vcard-org'),
      vcardEmail: id('vcard-email'),
    },
    event: {
      title: id('event-title'),
      allDay: id('event-all-day'),
      startDate: id('event-start-date'),
      startTime: id('event-start-time'),
      endDate: id('event-end-date'),
      endTime: id('event-end-time'),
    },
  });
  const center = id('frame-message-center');
  center.addEventListener('input', () => {
    section.setCentered(center.checked);
    options.render();
  });
  lineHeightValue.textContent = lookup('units.pixels', '{value} px', {
    value: lineHeight.value,
  });
  section.sync();
  return section;
}
