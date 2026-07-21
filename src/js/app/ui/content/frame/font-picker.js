import { getActiveLocale, lookup } from '../../../../i18n/index.js';
import { getFrameFontGroups } from './font-groups.js';
import { isFrameFontRecommended } from './font-options.js';

const DIALOG_ID = 'frame-font-dialog';

function getLabel(option) {
  return option.key ? lookup(option.key, option.label) : option.label;
}

function getGroupLabel(group) {
  const labels = {
    latin: () => lookup('frame.fontLatin', 'English and Spanish'),
    arabic: () => lookup('frame.fontArabic', 'Arabic'),
    hindi: () => lookup('frame.fontHindi', 'Hindi'),
    chinese: () => lookup('frame.fontChinese', 'Simplified Chinese'),
    general: () => lookup('frame.fontGeneral', 'General'),
  };
  return labels[group.id]();
}

function createChoice(document, option, installed, select, onSelect) {
  const entry = document.createElement('div');
  const button = document.createElement('button');
  entry.className = 'frame-font-entry';
  button.type = 'button';
  button.className = 'frame-font-option';
  button.dataset.fontValue = option.value;
  button.style.fontFamily = option.family;
  button.disabled = !installed;
  button.addEventListener('click', () => {
    select.value = option.value;
    const EventConstructor = document.defaultView.Event;
    select.dispatchEvent(new EventConstructor('change', { bubbles: true }));
    onSelect();
  });
  entry.append(button);
  if (!installed) {
    const status = document.createElement('span');
    status.className = 'frame-font-status';
    status.textContent = lookup('frame.notInstalled', 'Not installed');
    entry.append(status);
    if (option.infoUrl) {
      const link = document.createElement('a');
      link.className = 'frame-font-info';
      link.href = option.infoUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = lookup('frame.fontInfo', 'Font information \u{2197}');
      link.setAttribute(
        'aria-label',
        lookup('frame.aboutFont', 'Information about {font}', {
          font: getLabel(option),
        }),
      );
      entry.append(link);
    }
  }
  return { button, entry };
}

function createGroup(document, group) {
  const section = document.createElement('section');
  const heading = document.createElement('h3');
  const flag = document.createElement('span');
  const label = document.createElement('span');
  const grid = document.createElement('div');
  section.className = 'frame-font-group';
  flag.className = 'frame-font-group-flag';
  flag.setAttribute('aria-hidden', 'true');
  flag.textContent = group.flag;
  label.textContent = getGroupLabel(group);
  heading.append(flag, label);
  grid.className = 'frame-font-grid';
  section.append(heading, grid);
  return { grid, section };
}

export function createFontPicker({ document, select, onSelect }) {
  const dialog = document.createElement('dialog');
  const shell = document.createElement('div');
  const heading = document.createElement('h2');
  const groups = document.createElement('div');
  const close = document.createElement('button');

  dialog.id = DIALOG_ID;
  dialog.className = 'frame-font-dialog';
  dialog.setAttribute('aria-labelledby', `${DIALOG_ID}-title`);
  shell.className = 'frame-font-dialog-shell';
  heading.id = `${DIALOG_ID}-title`;
  groups.className = 'frame-font-options';
  close.type = 'button';
  close.className = 'secondary-button frame-font-close';
  close.addEventListener('click', () => dialog.close());
  shell.append(heading, groups, close);
  dialog.append(shell);
  document.body.append(dialog);

  const sync = () => {
    let selectedButton = null;
    const locale = getActiveLocale();
    heading.textContent = lookup('frame.chooseFont', 'Choose a font');
    close.textContent = lookup('common.close', 'Close');
    groups.replaceChildren();
    getFrameFontGroups({
      document,
      locale,
    }).forEach((group) => {
      const groupElements = createGroup(document, group);
      group.options.forEach(({ installed, option }) => {
        const { button, entry } = createChoice(
          document,
          option,
          installed,
          select,
          () => {
            onSelect();
            sync();
            dialog.close(option.value);
          },
        );
        const active = option.value === select.value;
        button.textContent = getLabel(option);
        if (isFrameFontRecommended(option, locale)) {
          button.dataset.recommended = lookup(
            'frame.recommended',
            'Recommended',
          );
        }
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', String(active));
        if (active && installed) selectedButton = button;
        groupElements.grid.append(entry);
      });
      groups.append(groupElements.section);
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
