import {
  getActiveLocale,
  getAvailableLocales,
  initializeLanguage,
  lookup,
  translateDocument,
} from './index.js';

export const LOCALE_STORAGE_KEY = 'qr.locale';

function getLanguageName(locale, displayLocale) {
  try {
    return (
      new Intl.DisplayNames([displayLocale], { type: 'language' }).of(locale) ||
      locale
    );
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

function canonicalizeLocale(locale) {
  try {
    return Intl.getCanonicalLocales(locale)[0];
  } catch {
    return undefined;
  }
}

export function prioritizeLocales(locales, requestedLocales = []) {
  const requested = Array.isArray(requestedLocales)
    ? requestedLocales
    : [requestedLocales];
  const preferences = [
    ...new Set(requested.map(canonicalizeLocale).filter(Boolean)),
  ];
  const ranked = locales.map((locale, index) => {
    const code = canonicalizeLocale(locale.code);
    let rank = Number.POSITIVE_INFINITY;
    preferences.forEach((preference, preferenceIndex) => {
      const exact = code === preference;
      const sameLanguage = code?.split('-')[0] === preference.split('-')[0];
      if (exact || sameLanguage) {
        rank = Math.min(rank, preferenceIndex * 2 + (exact ? 0 : 1));
      }
    });
    return { locale, index, rank };
  });

  return ranked
    .sort((left, right) => {
      const leftGroup = isDebugLocale(left.locale)
        ? 2
        : Number.isFinite(left.rank)
          ? 0
          : 1;
      const rightGroup = isDebugLocale(right.locale)
        ? 2
        : Number.isFinite(right.rank)
          ? 0
          : 1;
      const rankDifference =
        Number.isFinite(left.rank) && Number.isFinite(right.rank)
          ? left.rank - right.rank
          : 0;
      return (
        leftGroup - rightGroup || rankDifference || left.index - right.index
      );
    })
    .map(({ locale }) => locale);
}

export function getSavedLocale(storage) {
  try {
    return (
      (storage || getDefaultStorage())?.getItem(LOCALE_STORAGE_KEY) || undefined
    );
  } catch {
    return undefined;
  }
}

export function setupLanguagePicker({
  document = globalThis.document,
  storage,
  languages = globalThis.navigator?.languages || [
    globalThis.navigator?.language,
  ],
  onLocaleChange = async (locale) => {
    await initializeLanguage({ locale });
    await translateDocument(document);
  },
} = {}) {
  const picker = document?.getElementById('language-picker');
  const trigger = document?.getElementById('language-picker-trigger');
  const panel = document?.getElementById('language-picker-panel');
  const grid = document?.getElementById('language-picker-grid');
  if (!picker || !trigger || !panel || !grid) return;
  const loadingStatus = document.createElement('div');
  const loadingSpinner = document.createElement('span');
  const loadingLabel = document.createElement('span');
  loadingStatus.className = 'language-loading-status';
  loadingStatus.hidden = true;
  loadingStatus.setAttribute('role', 'status');
  loadingStatus.setAttribute('aria-live', 'polite');
  loadingSpinner.className = 'language-loading-spinner';
  loadingSpinner.setAttribute('aria-hidden', 'true');
  loadingStatus.append(loadingSpinner, loadingLabel);
  picker.appendChild(loadingStatus);

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

  const render = () => {
    const activeLocale = getActiveLocale();
    const locales = prioritizeLocales(getAvailableLocales(), languages);
    const active =
      locales.find(({ code }) => code === activeLocale) || locales[0];
    trigger.textContent = active?.flag || '🏳️';
    trigger.classList.toggle('is-debug-language', isDebugLocale(active));
    trigger.setAttribute(
      'aria-label',
      lookup('language.current', 'Language: {language}. Choose language.', {
        language: () => getLanguageName(activeLocale, activeLocale),
      }),
    );
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
      button.addEventListener('click', async () => {
        if (code === getActiveLocale()) {
          close({ focus: true });
          return;
        }
        close();
        loadingLabel.textContent = lookup(
          'language.loading',
          'Loading {language}...',
          { language: translatedName },
        );
        loadingStatus.hidden = false;
        picker.classList.add('is-loading');
        trigger.disabled = true;
        trigger.setAttribute('aria-busy', 'true');
        try {
          await new Promise((resolve) => requestAnimationFrame(resolve));
          await onLocaleChange(code);
          saveLocale(storage || getDefaultStorage(), getActiveLocale());
          render();
          close({ focus: true });
        } catch (error) {
          console.error(error);
        } finally {
          trigger.removeAttribute('aria-busy');
          trigger.disabled = false;
          picker.classList.remove('is-loading');
          loadingStatus.hidden = true;
        }
      });
      grid.appendChild(button);
    });
  };

  trigger.addEventListener('click', () => (panel.hidden ? open() : close()));
  document.addEventListener('pointerdown', (event) => {
    if (!panel.hidden && !picker.contains(event.target)) close();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !panel.hidden) close({ focus: true });
  });
  render();
}
