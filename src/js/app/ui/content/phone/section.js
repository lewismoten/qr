import { formatPhoneNumberForDisplay } from '../../../phone.js';

export function createPhoneSection({ buttons, inputs, defaultFormat = 'usa', onChange }) {
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
      if (input !== source && input.value !== source.value) input.value = source.value;
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

  return { initialize };
}
