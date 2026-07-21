import { lookup } from '../../../../i18n/index.js';
import { EMOJI_GROUPS } from './emoji-options.js';

const DIALOG_ID = 'center-emoji-dialog';

function getGroupLabel(id) {
  const labels = {
    connect: () => lookup('style.art.connect', 'Communication'),
    places: () => lookup('style.art.places', 'Places and events'),
    shopping: () => lookup('style.art.shopping', 'Shopping and access'),
    symbols: () => lookup('style.art.symbols', 'Symbols and ideas'),
    leisure: () => lookup('style.art.leisure', 'Media and leisure'),
  };
  return labels[id]();
}

function createOption(document, option, onSelect) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'emoji-dialog-option';
  button.dataset.emoji = option.value;
  button.textContent = option.value;
  button.setAttribute('aria-label', lookup(option.key, option.label));
  button.addEventListener('click', () => onSelect(option.value));
  return button;
}

function createGroup(document, group, onSelect) {
  const section = document.createElement('section');
  const heading = document.createElement('h3');
  const icon = document.createElement('span');
  const grid = document.createElement('div');
  section.className = 'emoji-dialog-group';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = group.icon;
  heading.append(icon, getGroupLabel(group.id));
  grid.className = 'emoji-dialog-grid';
  group.options.forEach((option) =>
    grid.append(createOption(document, option, onSelect)),
  );
  section.append(heading, grid);
  return section;
}

export function createEmojiDialog({ document, input, onSelect }) {
  const dialog = document.createElement('dialog');
  const shell = document.createElement('div');
  const heading = document.createElement('h2');
  const groups = document.createElement('div');
  const close = document.createElement('button');
  dialog.id = DIALOG_ID;
  dialog.className = 'emoji-dialog';
  dialog.setAttribute('aria-labelledby', `${DIALOG_ID}-title`);
  shell.className = 'emoji-dialog-shell';
  heading.id = `${DIALOG_ID}-title`;
  groups.className = 'emoji-dialog-groups';
  close.type = 'button';
  close.className = 'secondary-button emoji-dialog-close';
  close.addEventListener('click', () => dialog.close());
  shell.append(heading, groups, close);
  dialog.append(shell);
  document.body.append(dialog);

  const sync = () => {
    let selected = null;
    heading.textContent = lookup('style.art.chooseEmoji', 'Choose an emoji');
    close.textContent = lookup('common.close', 'Close');
    groups.replaceChildren();
    const choose = (value) => {
      onSelect(value);
      sync();
      dialog.close(value);
    };
    EMOJI_GROUPS.forEach((group) =>
      groups.append(createGroup(document, group, choose)),
    );
    groups.querySelectorAll('[data-emoji]').forEach((button) => {
      const active = button.dataset.emoji === input.value;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
      if (active) selected = button;
    });
    return selected;
  };
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  document.addEventListener('languagechange', sync);
  return {
    open() {
      const selected = sync();
      if (!dialog.open) dialog.showModal();
      selected?.focus({ preventScroll: true });
    },
    sync,
  };
}
