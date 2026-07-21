import { getActiveLocale, lookup } from '../../../../i18n/index.js';
import {
  getVisibleFrameFontOptions,
  isFrameFontRecommended,
} from './font-options.js';

const DIALOG_ID = 'frame-font-dialog';

function getLabel(option) {
  return option.key ? lookup(option.key, option.label) : option.label;
}

function createChoice(document, option, select, onSelect) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'frame-font-option';
  button.dataset.fontValue = option.value;
  button.style.fontFamily = option.family;
  button.addEventListener('click', () => {
    select.value = option.value;
    const EventConstructor = document.defaultView.Event;
    select.dispatchEvent(new EventConstructor('change', { bubbles: true }));
    onSelect();
  });
  return button;
}

export function createFontPicker({ document, select, onSelect }) {
  const dialog = document.createElement('dialog');
  const shell = document.createElement('div');
  const heading = document.createElement('h2');
  const grid = document.createElement('div');
  const close = document.createElement('button');

  dialog.id = DIALOG_ID;
  dialog.className = 'frame-font-dialog';
  dialog.setAttribute('aria-labelledby', `${DIALOG_ID}-title`);
  shell.className = 'frame-font-dialog-shell';
  heading.id = `${DIALOG_ID}-title`;
  grid.className = 'frame-font-options';
  close.type = 'button';
  close.className = 'secondary-button frame-font-close';
  close.addEventListener('click', () => dialog.close());
  shell.append(heading, grid, close);
  dialog.append(shell);
  document.body.append(dialog);

  const sync = () => {
    let selectedButton = null;
    const locale = getActiveLocale();
    heading.textContent = lookup('frame.chooseFont', 'Choose a font');
    close.textContent = lookup('common.close', 'Close');
    grid.replaceChildren();
    getVisibleFrameFontOptions({
      document,
      locale,
      selected: select.value,
    }).forEach((option) => {
      const button = createChoice(document, option, select, () => {
        onSelect();
        sync();
        dialog.close(option.value);
      });
      const active = option.value === select.value;
      button.textContent = getLabel(option);
      if (isFrameFontRecommended(option, locale)) {
        button.dataset.recommended = lookup('frame.recommended', 'Recommended');
      }
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
      if (active) selectedButton = button;
      grid.append(button);
    });
    return selectedButton;
  };
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  document.addEventListener('languagechange', sync);
  return {
    open() {
      const selectedButton = sync();
      if (!dialog.open) dialog.showModal();
      selectedButton?.focus({ preventScroll: true });
    },
    sync,
  };
}
