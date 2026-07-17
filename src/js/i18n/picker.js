import { getActiveLocale, getAvailableLocales, lookup } from './index.js';

export const LOCALE_STORAGE_KEY = 'qr.locale';

function getLanguageName(locale, displayLocale) {
  try {
    return new Intl.DisplayNames([displayLocale], { type: 'language' }).of(locale) || locale;
  } catch {
    return locale;
  }
}

function saveLocale(storage, locale) {
  try {
    storage?.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Language selection still works for this page when storage is unavailable.
  }
}

function getDefaultStorage() {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

function isDebugLocale(locale) {
  return locale?.debug === true || locale?.code === 'en-XA';
}

export function getSavedLocale(storage) {
  try {
    return (storage || getDefaultStorage())?.getItem(LOCALE_STORAGE_KEY) || undefined;
  } catch {
    return undefined;
  }
}

export function setupLanguagePicker({
  document = globalThis.document,
  storage,
  reload = () => globalThis.location?.reload(),
} = {}) {
  const picker = document?.getElementById('language-picker');
  const trigger = document?.getElementById('language-picker-trigger');
  const panel = document?.getElementById('language-picker-panel');
  const grid = document?.getElementById('language-picker-grid');
  if (!picker || !trigger || !panel || !grid) return;

  const activeLocale = getActiveLocale();
  const locales = [...getAvailableLocales()].sort(
    (left, right) => Number(isDebugLocale(left)) - Number(isDebugLocale(right)),
  );
  const active = locales.find(({ code }) => code === activeLocale) || locales[0];
  const close = ({ focus = false } = {}) => {
    panel.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    if (focus) trigger.focus();
  };
  const open = () => {
    panel.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    grid.querySelector('[aria-current="true"]')?.focus();
  };

  trigger.textContent = active?.flag || '🏳️';
  trigger.classList.toggle('is-debug-language', isDebugLocale(active));
  trigger.setAttribute('aria-label', lookup('language.current', 'Language: {language}. Choose language.', {
    language: () => getLanguageName(activeLocale, activeLocale),
  }));
  grid.replaceChildren();
  locales.forEach((locale) => {
    const { code, flag, name, nativeName: configuredNativeName } = locale;
    const translatedName = name || getLanguageName(code, activeLocale);
    const nativeName = configuredNativeName || getLanguageName(code, code);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `language-option${isDebugLocale(locale) ? ' language-option-debug' : ''}`;
    button.lang = code;
    button.setAttribute('role', 'option');
    button.setAttribute('aria-current', String(code === activeLocale));
    button.setAttribute('aria-selected', String(code === activeLocale));
    const flagElement = document.createElement('span');
    flagElement.className = 'language-option-flag';
    flagElement.setAttribute('aria-hidden', 'true');
    flagElement.textContent = flag;
    const names = document.createElement('span');
    names.className = 'language-option-names';
    const translated = document.createElement('strong');
    translated.textContent = translatedName;
    const native = document.createElement('small');
    native.textContent = nativeName;
    names.append(translated, native);
    button.append(flagElement, names);
    button.addEventListener('click', () => {
      if (code === activeLocale) {
        close({ focus: true });
        return;
      }
      saveLocale(storage || getDefaultStorage(), code);
      reload();
    });
    grid.appendChild(button);
  });

  trigger.addEventListener('click', () => (panel.hidden ? open() : close()));
  document.addEventListener('pointerdown', (event) => {
    if (!panel.hidden && !picker.contains(event.target)) close();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !panel.hidden) close({ focus: true });
  });
}
