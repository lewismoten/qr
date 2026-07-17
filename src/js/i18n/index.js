const DEFAULT_LOCALE = 'en-US';
const TRANSLATED_ATTRIBUTES = ['aria-label', 'placeholder', 'title'];

let activeLocale = DEFAULT_LOCALE;
let messages = Object.freeze({});
let availableLocales = Object.freeze([{ code: DEFAULT_LOCALE, flag: '🇺🇸' }]);
let languageReady = Promise.resolve({ locale: activeLocale, loaded: false });

function canonicalizeLocale(locale) {
  if (typeof locale !== 'string' || !locale.trim()) return undefined;
  try {
    return Intl.getCanonicalLocales(locale)[0];
  } catch {
    return undefined;
  }
}

function normalizeLocales(locales) {
  return [...new Set((Array.isArray(locales) ? locales : [locales])
    .map(canonicalizeLocale)
    .filter(Boolean))];
}

function normalizeLocaleEntries(locales) {
  const entries = Array.isArray(locales) ? locales : [locales];
  const normalized = [];
  for (const entry of entries) {
    const source = typeof entry === 'string' ? { code: entry } : entry;
    const code = canonicalizeLocale(source?.code);
    if (!code || normalized.some((locale) => locale.code === code)) continue;
    normalized.push(Object.freeze({ code, flag: String(source.flag || '🏳️') }));
  }
  return normalized;
}

function selectLocale(requestedLocales, availableLocales, fallbackLocale) {
  const available = normalizeLocales(availableLocales);
  const fallback = canonicalizeLocale(fallbackLocale) || DEFAULT_LOCALE;

  for (const requested of normalizeLocales(requestedLocales)) {
    const exact = available.find((locale) => locale === requested);
    if (exact) return exact;

    const language = requested.split('-')[0];
    const languageMatch = available.find((locale) => locale === language)
      || available.find((locale) => locale.split('-')[0] === language);
    if (languageMatch) return languageMatch;
  }
  return available.includes(fallback) ? fallback : available[0] || fallback;
}

async function fetchJson(fetcher, url) {
  const response = await fetcher(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Unable to load language resource: ${response.status}`);
  return response.json();
}

function findMessage(key) {
  if (typeof key !== 'string' || !key.trim()) return undefined;
  return key.split('.').reduce((value, part) => (
    value && Object.prototype.hasOwnProperty.call(value, part) ? value[part] : undefined
  ), messages);
}

function interpolate(text, options, key) {
  if (!options || typeof options !== 'object') return text;
  const resolved = new Map();
  return text.replace(/\{([A-Za-z][\w.-]*)\}/g, (placeholder, tag) => (
    Object.prototype.hasOwnProperty.call(options, tag)
      ? String(resolved.has(tag) ? resolved.get(tag) : (() => {
        const option = options[tag];
        const value = typeof option === 'function'
          ? option({ key, tag, locale: activeLocale, options })
          : option;
        resolved.set(tag, value);
        return value;
      })())
      : placeholder
  ));
}

export function lookup(key, defaultText = '', options) {
  const value = findMessage(key);
  return interpolate(typeof value === 'string' ? value : defaultText, options, key);
}

export function getErrorText(error, defaultText = '') {
  if (error?.i18nKey) return lookup(error.i18nKey, error.message || defaultText, error.i18nOptions);
  return error?.message || defaultText;
}

export function getActiveLocale() {
  return activeLocale;
}

export function getAvailableLocales() {
  return availableLocales;
}

export function whenLanguageReady() {
  return languageReady;
}

export function initializeLanguage({
  locale,
  languages = globalThis.navigator?.languages || [globalThis.navigator?.language],
  fetcher = globalThis.fetch?.bind(globalThis),
  baseUrl = new URL('locales/', globalThis.document?.baseURI || 'http://localhost/'),
} = {}) {
  languageReady = (async () => {
    if (typeof fetcher !== 'function') return { locale: activeLocale, loaded: false };

    let manifest = { defaultLocale: DEFAULT_LOCALE, locales: [DEFAULT_LOCALE] };
    try {
      manifest = await fetchJson(fetcher, new URL('manifest.json', baseUrl));
    } catch {
      // The built-in default remains usable if locale discovery is unavailable.
    }

    const localeEntries = normalizeLocaleEntries(manifest.locales);
    availableLocales = Object.freeze(localeEntries.length
      ? localeEntries
      : [{ code: DEFAULT_LOCALE, flag: '🇺🇸' }]);
    const localeCodes = availableLocales.map(({ code }) => code);
    const fallback = canonicalizeLocale(manifest.defaultLocale) || DEFAULT_LOCALE;
    const selected = selectLocale(locale ? [locale] : languages, localeCodes, fallback);
    const attempts = [...new Set([selected, fallback, DEFAULT_LOCALE])];

    for (const locale of attempts) {
      try {
        const loadedMessages = await fetchJson(fetcher, new URL(`${locale}.json`, baseUrl));
        if (!loadedMessages || typeof loadedMessages !== 'object' || Array.isArray(loadedMessages)) continue;
        activeLocale = locale;
        messages = Object.freeze(loadedMessages);
        return { locale, loaded: true };
      } catch {
        // Continue through the fallback chain; embedded page text is the final fallback.
      }
    }
    activeLocale = fallback;
    messages = Object.freeze({});
    return { locale: activeLocale, loaded: false };
  })();
  return languageReady;
}

export function translateDocument(document) {
  document.documentElement.lang = activeLocale;
  document.documentElement.dir = /^(ar|fa|he|ur)(-|$)/i.test(activeLocale) ? 'rtl' : 'ltr';
  document.querySelectorAll('[data-i18n]').forEach((element) => {
    element.textContent = lookup(element.dataset.i18n, element.textContent);
  });
  TRANSLATED_ATTRIBUTES.forEach((attribute) => {
    const dataAttribute = `data-i18n-${attribute}`;
    document.querySelectorAll(`[${dataAttribute}]`).forEach((element) => {
      element.setAttribute(attribute, lookup(element.getAttribute(dataAttribute), element.getAttribute(attribute) || ''));
    });
  });
}
