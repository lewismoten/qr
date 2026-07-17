export const DEFAULT_LOCALE = 'en-US';

export function canonicalizeLocale(locale) {
  if (typeof locale !== 'string' || !locale.trim()) return undefined;
  try {
    return Intl.getCanonicalLocales(locale)[0];
  } catch {
    return undefined;
  }
}

function normalizeLocales(locales) {
  return [
    ...new Set(
      (Array.isArray(locales) ? locales : [locales])
        .map(canonicalizeLocale)
        .filter(Boolean),
    ),
  ];
}

export function normalizeLocaleEntries(locales) {
  const entries = Array.isArray(locales) ? locales : [locales];
  const normalized = [];
  for (const entry of entries) {
    const source = typeof entry === 'string' ? { code: entry } : entry;
    const code = canonicalizeLocale(source?.code);
    if (!code || normalized.some((locale) => locale.code === code)) continue;
    normalized.push(
      Object.freeze({
        code,
        flag: String(source.flag || '🏳️'),
        name: typeof source.name === 'string' ? source.name : undefined,
        nativeName:
          typeof source.nativeName === 'string' ? source.nativeName : undefined,
        ...(source.debug === true ? { debug: true } : {}),
      }),
    );
  }
  return normalized;
}

export function selectLocale(requested, availableLocales, fallbackLocale) {
  const available = normalizeLocales(availableLocales);
  const fallback = canonicalizeLocale(fallbackLocale) || DEFAULT_LOCALE;
  for (const locale of normalizeLocales(requested)) {
    const exact = available.find((entry) => entry === locale);
    if (exact) return exact;
    const language = locale.split('-')[0];
    const match =
      available.find((entry) => entry === language) ||
      available.find((entry) => entry.split('-')[0] === language);
    if (match) return match;
  }
  return available.includes(fallback) ? fallback : available[0] || fallback;
}

export async function fetchJson(fetcher, url) {
  const response = await fetcher(url, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Unable to load language resource: ${response.status}`);
  }
  return response.json();
}

function isMessageObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function mergeMessages(parent, child) {
  const merged = { ...parent };
  for (const [key, value] of Object.entries(child)) {
    if (key === 'extends') continue;
    merged[key] =
      isMessageObject(value) && isMessageObject(parent[key])
        ? mergeMessages(parent[key], value)
        : value;
  }
  return merged;
}

export function createLocaleLoader(fetcher, baseUrl) {
  const cache = new Map();
  const load = (locale, ancestors = []) => {
    const normalized = canonicalizeLocale(locale);
    if (!normalized) return Promise.reject(new Error('Invalid parent locale.'));
    if (ancestors.includes(normalized)) {
      const chain = [...ancestors, normalized].join(' -> ');
      return Promise.reject(new Error(`Circular locale inheritance: ${chain}`));
    }
    if (cache.has(normalized)) return cache.get(normalized);
    const request = fetchJson(
      fetcher,
      new URL(`${normalized}.json`, baseUrl),
    ).then(async (resource) => {
      if (!isMessageObject(resource)) {
        throw new Error(`Invalid language resource: ${normalized}`);
      }
      const parentLocale = canonicalizeLocale(resource.extends);
      const parent = parentLocale
        ? await load(parentLocale, [...ancestors, normalized])
        : {};
      return mergeMessages(parent, resource);
    });
    cache.set(normalized, request);
    return request;
  };
  return load;
}

export function findMessageIn(source, key) {
  if (typeof key !== 'string' || !key.trim()) return undefined;
  return key
    .split('.')
    .reduce(
      (value, part) =>
        value && Object.prototype.hasOwnProperty.call(value, part)
          ? value[part]
          : undefined,
      source,
    );
}
