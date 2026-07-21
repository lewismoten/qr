import { lookup } from '../../../../i18n/index.js';
import { loadFeatureStylesheet } from '../../../../stylesheets.js';
import { createFrameSection } from './frame-content-section.js';
import { FRAME_FONT_OPTIONS, getFrameFontOption } from './font-options.js';

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
  const font = id('frame-font');
  const fontMore = id('frame-font-more');
  const fontSelected = id('frame-font-selected-value');
  const fontStyles = loadFeatureStylesheet('content-frame').catch(
    console.error,
  );
  const section = createFrameSection({
    ...options,
    mode: id('frame-message-mode'),
    customField: id('custom-frame-message-field'),
    customMessage: id('custom-frame-message'),
    centerCheckbox: id('frame-message-center'),
    artCenterToggle: deferredControl('frame-message-center-art', false),
    artMode: deferredControl('center-art-mode', 'none'),
    font,
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
  FRAME_FONT_OPTIONS.forEach((option) => {
    if ([...font.options].some(({ value }) => value === option.value)) return;
    const item = document.createElement('option');
    item.value = option.value;
    item.textContent = option.label;
    font.add(item);
  });
  const syncFont = () => {
    const selected = getFrameFontOption(font.value);
    fontSelected.textContent = selected.key
      ? lookup(selected.key, selected.label)
      : selected.label;
    fontSelected.style.fontFamily = selected.family;
    document
      .querySelectorAll('[data-choice-target="frame-font"]')
      .forEach((button) => {
        const active = button.dataset.choiceValue === selected.value;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', String(active));
      });
  };
  let fontPickerRequest;
  font.addEventListener('change', syncFont);
  document.addEventListener('languagechange', syncFont);
  fontMore.addEventListener('click', async () => {
    if (!fontPickerRequest) {
      fontPickerRequest = Promise.all([
        fontStyles,
        import('./font-picker.js'),
      ]).then(([, module]) =>
        module.createFontPicker({
          document,
          select: font,
          onSelect: options.render,
        }),
      );
    }
    try {
      (await fontPickerRequest).open();
    } catch (error) {
      fontPickerRequest = null;
      console.error(error);
    }
  });
  lineHeightValue.textContent = lookup('units.pixels', '{value} px', {
    value: lineHeight.value,
  });
  syncFont();
  section.sync();
  return section;
}
