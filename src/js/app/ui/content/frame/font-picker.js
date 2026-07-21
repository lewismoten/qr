import { lookup } from '../../../../i18n/index.js';
import { FRAME_FONT_OPTIONS, getFrameFontOption } from './font-options.js';

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
  FRAME_FONT_OPTIONS.forEach((option) => {
    grid.append(
      createChoice(document, option, select, () => {
        onSelect();
        dialog.close(option.value);
      }),
    );
  });
  shell.append(heading, grid, close);
  dialog.append(shell);
  document.body.append(dialog);

  const sync = () => {
    heading.textContent = lookup('frame.chooseFont', 'Choose a font');
    close.textContent = lookup('common.close', 'Close');
    grid.querySelectorAll('[data-font-value]').forEach((button) => {
      const option = getFrameFontOption(button.dataset.fontValue);
      const active = option.value === select.value;
      button.textContent = getLabel(option);
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  };
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  document.addEventListener('languagechange', sync);
  return {
    open() {
      sync();
      if (!dialog.open) dialog.showModal();
    },
    sync,
  };
}
