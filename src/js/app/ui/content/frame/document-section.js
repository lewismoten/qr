import { lookup } from '../../../../i18n/index.js';
import { createFrameSection } from './section.js';

export function createFrameSectionFromDocument(document, options) {
  const id = (name) => document.getElementById(name);
  const lineHeight = id('frame-line-height');
  const lineHeightValue = id('frame-line-height-value');
  const section = createFrameSection({
    ...options,
    mode: id('frame-message-mode'),
    customField: id('custom-frame-message-field'),
    customMessage: id('custom-frame-message'),
    centerCheckbox: id('frame-message-center'),
    artCenterCheckbox: id('frame-message-center-art'),
    artMode: id('center-art-mode'),
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
  const artCenter = id('frame-message-center-art');
  center.addEventListener('input', () => {
    section.setCentered(center.checked);
    options.render();
  });
  artCenter.addEventListener('input', () => {
    section.setCentered(artCenter.checked);
    options.render();
  });
  lineHeightValue.textContent = lookup('units.pixels', '{value} px', {
    value: lineHeight.value,
  });
  section.sync();
  return section;
}
