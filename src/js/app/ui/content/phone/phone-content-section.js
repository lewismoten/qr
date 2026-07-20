import { formatPhoneNumberForDisplay } from '../../../data/phone.js';
import { serializePhone, serializeSms } from '../../../data/content-formats.js';
import { lookup } from '../../../../i18n/index.js';

export function createPhoneSection({
  buttons,
  inputs,
  phoneInput,
  smsInput,
  smsBody,
  defaultFormat = 'usa',
  onChange,
  smsLengthHint,
  smsMaxLength,
}) {
  let format = defaultFormat;

  const syncButtons = () => {
    buttons.forEach((button) => {
      const active = button.dataset.phoneFormat === format;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  };

  const syncValues = (source) => {
    inputs.forEach((input) => {
      if (input !== source && input.value !== source.value)
        input.value = source.value;
    });
  };

  const formatInput = (input) => {
    const formatted = formatPhoneNumberForDisplay(input.value, format);
    if (formatted) input.value = formatted;
  };

  const formatAll = () => inputs.forEach(formatInput);

  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      format = button.dataset.phoneFormat || defaultFormat;
      syncButtons();
      formatInput(inputs[0]);
      syncValues(inputs[0]);
      formatAll();
      onChange();
    });
  });

  inputs.forEach((input) => {
    input.addEventListener('input', () => syncValues(input));
    input.addEventListener('blur', () => {
      formatInput(input);
      syncValues(input);
      formatAll();
      onChange();
    });
  });

  const initialize = () => {
    syncButtons();
    formatInput(inputs[0]);
    syncValues(inputs[0]);
    formatAll();
  };

  const buildPhonePayload = () => serializePhone(phoneInput.value);
  const buildSmsPayload = () =>
    !smsInput.value.trim() && !smsBody.value.trim()
      ? ''
      : serializeSms({ number: smsInput.value, message: smsBody.value });
  const buildPhonePreview = () =>
    serializePhone(phoneInput.value) ||
    `tel:${lookup('content.preview.phoneNumber', '[Phone number]')}`;
  const buildSmsPreview = () =>
    serializeSms({
      number: smsInput.value,
      message: smsBody.value || lookup('content.preview.message', '[Message]'),
    }).replace(
      'SMSTO::',
      `SMSTO:${lookup('content.preview.phoneNumber', '[Phone number]')}:`,
    );
  const syncSmsLength = () => {
    if (!smsLengthHint) return;
    smsLengthHint.textContent = lookup('common.count', '{current} / {total}', {
      current: smsBody.value.length,
      total: smsMaxLength,
    });
  };

  return {
    initialize,
    buildPhonePayload,
    buildSmsPayload,
    buildPhonePreview,
    buildSmsPreview,
    syncSmsLength,
  };
}

export function createPhoneSectionFromDocument(document, options) {
  const phone = document.getElementById('phone-number');
  const sms = document.getElementById('sms-number');
  const vcard = document.getElementById('vcard-phone');
  return createPhoneSection({
    buttons: document.querySelectorAll('.phone-format-button'),
    inputs: [phone, sms, vcard],
    phoneInput: phone,
    smsInput: sms,
    smsBody: document.getElementById('sms-body'),
    smsLengthHint: document.getElementById('sms-length-hint'),
    ...options,
  });
}
