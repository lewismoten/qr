const DEFAULT_LOCALE = 'en-US';
const TRANSLATED_ATTRIBUTES = ['aria-label', 'placeholder', 'title', 'value'];

let activeLocale = DEFAULT_LOCALE;
let messages = Object.freeze({});
let debugLanguage = false;
let availableLocales = Object.freeze([{ code: DEFAULT_LOCALE, flag: '🇺🇸' }]);
let languageReady = Promise.resolve({ locale: activeLocale, loaded: false });
let loadLocaleResource;

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
    normalized.push(Object.freeze({
      code,
      flag: String(source.flag || '🏳️'),
      name: typeof source.name === 'string' ? source.name : undefined,
      nativeName: typeof source.nativeName === 'string' ? source.nativeName : undefined,
      ...(source.debug === true ? { debug: true } : {}),
    }));
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

function isMessageObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function mergeMessages(parent, child) {
  const merged = { ...parent };
  for (const [key, value] of Object.entries(child)) {
    if (key === 'extends') continue;
    merged[key] = isMessageObject(value) && isMessageObject(parent[key])
      ? mergeMessages(parent[key], value)
      : value;
  }
  return merged;
}

function createLocaleLoader(fetcher, baseUrl) {
  const cache = new Map();
  const load = (locale, ancestors = []) => {
    const normalized = canonicalizeLocale(locale);
    if (!normalized) return Promise.reject(new Error('Invalid parent locale.'));
    if (ancestors.includes(normalized)) {
      return Promise.reject(new Error(`Circular locale inheritance: ${[...ancestors, normalized].join(' -> ')}`));
    }
    if (cache.has(normalized)) return cache.get(normalized);

    const request = fetchJson(fetcher, new URL(`${normalized}.json`, baseUrl)).then(async (resource) => {
      if (!isMessageObject(resource)) throw new Error(`Invalid language resource: ${normalized}`);
      const parentLocale = canonicalizeLocale(resource.extends);
      const parent = parentLocale ? await load(parentLocale, [...ancestors, normalized]) : {};
      return mergeMessages(parent, resource);
    });
    cache.set(normalized, request);
    return request;
  };
  return load;
}

function findMessageIn(source, key) {
  if (typeof key !== 'string' || !key.trim()) return undefined;
  return key.split('.').reduce((value, part) => (
    value && Object.prototype.hasOwnProperty.call(value, part) ? value[part] : undefined
  ), source);
}

function findMessage(key) {
  return findMessageIn(messages, key);
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
  if (debugLanguage && typeof key === 'string' && key) return key;
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

export function isDebugLanguage() {
  return debugLanguage;
}

export async function getTranslationEntries(key) {
  if (!loadLocaleResource) return [];
  const locales = availableLocales.filter(({ code }) => code !== 'en-XA');
  return Promise.all(locales.map(async (locale) => {
    try {
      const localeMessages = await loadLocaleResource(locale.code);
      const value = findMessageIn(localeMessages, key);
      return { ...locale, value: typeof value === 'string' ? value : undefined };
    } catch {
      return { ...locale, value: undefined };
    }
  }));
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
  languages = globalThis.navigator?.languages || [globalThis.navigator?.language],
  fetcher = globalThis.fetch?.bind(globalThis),
  baseUrl = new URL('locales/', globalThis.document?.baseURI || 'http://localhost/'),
} = {}) {
  languageReady = (async () => {
    loadLocaleResource = undefined;
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
        // Continue through the fallback chain; embedded page text is the final fallback.
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
  document.documentElement.dir = /^(ar|fa|he|ur)(-|$)/i.test(activeLocale) ? 'rtl' : 'ltr';
  document.documentElement.classList.toggle('i18n-debug', debugLanguage);
  document.querySelectorAll('[data-i18n]').forEach((element) => {
    element.textContent = lookup(element.dataset.i18n, element.textContent);
  });
  TRANSLATED_ATTRIBUTES.forEach((attribute) => {
    const dataAttribute = `data-i18n-${attribute}`;
    document.querySelectorAll(`[${dataAttribute}]`).forEach((element) => {
      const translated = lookup(element.getAttribute(dataAttribute), element.getAttribute(attribute) || '');
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
