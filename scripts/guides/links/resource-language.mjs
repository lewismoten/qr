const SITE_ORIGIN = 'https://qr.lewismoten.com';
const OSM_LOCALES = new Set(['ar', 'es', 'hi-IN', 'zh-CN']);
const OSM_COPYRIGHT_LOCALES = new Set(['ar', 'es', 'zh-CN']);

function isoSpanishUrl(url) {
  const id = url.pathname.match(/^\/standard\/(\d{5})\.html$/)?.[1];
  if (!id) return undefined;
  const directory = `${id.slice(0, 2)}/${id.slice(2, 4)}`;
  url.pathname = `/es/contents/data/standard/${directory}/${id}.html`;
  return url;
}

function localizedResource(url, locale) {
  if (locale === 'es' && url.hostname === 'www.iso.org') {
    const localized = isoSpanishUrl(url);
    if (localized) return { language: 'es', url: localized };
  }
  if (url.hostname !== 'www.openstreetmap.org') return undefined;
  if (url.pathname === '/' && OSM_LOCALES.has(locale)) {
    url.searchParams.set('locale', locale);
    return { language: locale, url };
  }
  if (url.pathname === '/copyright' && OSM_COPYRIGHT_LOCALES.has(locale)) {
    url.pathname = `/copyright/${locale}`;
    return { language: locale, url };
  }
  return undefined;
}

function setAttribute(attributes, name, value) {
  const pattern = new RegExp(`\\s${name}=(['"])[\\s\\S]*?\\1`, 'i');
  const attribute = ` ${name}="${value}"`;
  return pattern.test(attributes)
    ? attributes.replace(pattern, attribute)
    : `${attributes}${attribute}`;
}

export function annotateExternalResourceLanguages(
  source,
  locale,
  englishLabel = 'The linked resource is available in English',
) {
  return source.replace(
    /<a\b([^>]*\bhref=(['"])(https?:\/\/[^'"]+)\2[^>]*)>([\s\S]*?)<\/a\s*>/gi,
    (link, originalAttributes, _quote, href, content) => {
      const url = new URL(href);
      if (url.origin === SITE_ORIGIN) return link;
      const localized = localizedResource(new URL(url), locale);
      const language = localized?.language || 'en';
      let attributes = setAttribute(
        originalAttributes,
        'href',
        (localized?.url || url).href,
      );
      attributes = setAttribute(attributes, 'hreflang', language);
      attributes = setAttribute(attributes, 'data-resource-language', language);
      if (language === locale || locale.startsWith('en')) {
        return `<a${attributes}>${content}</a>`;
      }
      const indicator =
        '<span class="resource-language-indicator" lang="en" ' +
        `aria-label="${englishLabel}" title="${englishLabel}">EN</span>`;
      return `<a${attributes}>${content}${indicator}</a>`;
    },
  );
}
