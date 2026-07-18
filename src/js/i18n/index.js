import {
  DEFAULT_LOCALE,
  canonicalizeLocale,
  createLocaleLoader,
  fetchJson,
  findMessageIn,
  normalizeLocaleEntries,
  selectLocale,
} from './locale-resources.js';
import { localizeGuideLinks } from './guide-path.js';

const TRANSLATED_ATTRIBUTES = ['aria-label', 'placeholder', 'title', 'value'];

let activeLocale = DEFAULT_LOCALE;
let messages = Object.freeze({});
let debugLanguage = false;
let availableLocales = Object.freeze([{ code: DEFAULT_LOCALE, flag: '🇺🇸' }]);
let languageReady = Promise.resolve({ locale: activeLocale, loaded: false });
let loadLocaleResource;

function findMessage(key) {
  return findMessageIn(messages, key);
}

function interpolate(text, options, key) {
  if (!options || typeof options !== 'object') return text;
  const resolved = new Map();
  return text.replace(/\{([A-Za-z][\w.-]*)\}/g, (placeholder, tag) =>
    Object.prototype.hasOwnProperty.call(options, tag)
      ? String(
          resolved.has(tag)
            ? resolved.get(tag)
            : (() => {
                const option = options[tag];
                const value =
                  typeof option === 'function'
                    ? option({ key, tag, locale: activeLocale, options })
                    : option;
                resolved.set(tag, value);
                return value;
              })(),
        )
      : placeholder,
  );
}

export function lookup(key, defaultText = '', options) {
  if (debugLanguage && typeof key === 'string' && key) return key;
  const value = findMessage(key);
  return interpolate(
    typeof value === 'string' ? value : defaultText,
    options,
    key,
  );
}

export function getErrorText(error, defaultText = '') {
  if (error?.source === 'qr' && error?.key)
    return lookup(
      `qr.errors.${error.key}`,
      error.message || defaultText,
      error.details,
    );
  if (error?.i18nKey)
    return lookup(
      error.i18nKey,
      error.message || defaultText,
      error.i18nOptions,
    );
  return defaultText || error?.message || '';
}

export function getActiveLocale() {
  return activeLocale;
}

export function getAvailableLocales() {
  return availableLocales;
}

export function isDebugLanguage() {
  return debugLanguage;
}

export async function getTranslationEntries(key) {
  if (!loadLocaleResource) return [];
  const locales = availableLocales.filter(({ code }) => code !== 'en-XA');
  return Promise.all(
    locales.map(async (locale) => {
      try {
        const localeMessages = await loadLocaleResource(locale.code);
        const value = findMessageIn(localeMessages, key);
        return {
          ...locale,
          value: typeof value === 'string' ? value : undefined,
        };
      } catch {
        return { ...locale, value: undefined };
      }
    }),
  );
}

export function preloadTranslationEntries() {
  if (!loadLocaleResource) return Promise.resolve([]);
  return Promise.allSettled(
    availableLocales
      .filter(({ code }) => code !== 'en-XA')
      .map(({ code }) => loadLocaleResource(code)),
  );
}

export function whenLanguageReady() {
  return languageReady;
}

export function initializeLanguage({
  locale,
  languages = globalThis.navigator?.languages || [
    globalThis.navigator?.language,
  ],
  fetcher = globalThis.fetch?.bind(globalThis),
  baseUrl = new URL(
    'locales/',
    globalThis.document?.baseURI || 'http://localhost/',
  ),
} = {}) {
  languageReady = (async () => {
    loadLocaleResource = undefined;
    if (typeof fetcher !== 'function')
      return { locale: activeLocale, loaded: false };

    let manifest = { defaultLocale: DEFAULT_LOCALE, locales: [DEFAULT_LOCALE] };
    try {
      manifest = await fetchJson(fetcher, new URL('manifest.json', baseUrl));
    } catch {
      // The built-in default remains usable if locale discovery is unavailable.
    }

    const localeEntries = normalizeLocaleEntries(manifest.locales);
    availableLocales = Object.freeze(
      localeEntries.length
        ? localeEntries
        : [{ code: DEFAULT_LOCALE, flag: '🇺🇸' }],
    );
    const localeCodes = availableLocales.map(({ code }) => code);
    const fallback =
      canonicalizeLocale(manifest.defaultLocale) || DEFAULT_LOCALE;
    const selected = selectLocale(
      locale ? [locale] : languages,
      localeCodes,
      fallback,
    );
    const attempts = [...new Set([selected, fallback, DEFAULT_LOCALE])];
    const loadLocale = createLocaleLoader(fetcher, baseUrl);
    loadLocaleResource = loadLocale;

    for (const locale of attempts) {
      try {
        const loadedMessages = await loadLocale(locale);
        activeLocale = locale;
        debugLanguage = loadedMessages.$debug === true;
        messages = Object.freeze(loadedMessages);
        return { locale, loaded: true };
      } catch {
        // Continue through the fallback chain. Embedded page text is the final
        // fallback.
      }
    }
    activeLocale = fallback;
    debugLanguage = false;
    messages = Object.freeze({});
    return { locale: activeLocale, loaded: false };
  })();
  return languageReady;
}

export function translateDocument(document) {
  document.documentElement.lang = activeLocale;
  document.documentElement.dir = /^(ar|fa|he|ur)(-|$)/i.test(activeLocale)
    ? 'rtl'
    : 'ltr';
  document.documentElement.classList.toggle('i18n-debug', debugLanguage);
  localizeGuideLinks(document, activeLocale);
  document.querySelectorAll('[data-i18n]').forEach((element) => {
    element.textContent = lookup(element.dataset.i18n, element.textContent);
  });
  TRANSLATED_ATTRIBUTES.forEach((attribute) => {
    const dataAttribute = `data-i18n-${attribute}`;
    document.querySelectorAll(`[${dataAttribute}]`).forEach((element) => {
      const translated = lookup(
        element.getAttribute(dataAttribute),
        element.getAttribute(attribute) || '',
      );
      if (attribute !== 'value') {
        element.setAttribute(attribute, translated);
        return;
      }

      const previous = element.dataset.i18nAppliedValue;
      if (previous === undefined || element.value === previous) {
        element.value = translated;
        element.defaultValue = translated;
      }
      element.dataset.i18nAppliedValue = translated;
    });
  });
}
