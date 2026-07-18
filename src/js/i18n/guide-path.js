const GUIDE_LOCALES = new Set(['ar', 'es', 'hi-IN', 'zh-CN']);
const GUIDE_LOCALE_PATTERN = [...GUIDE_LOCALES].join('|');

function getBaseGuidePath(path) {
  const match = path.match(
    new RegExp(`^(.*?)(?:\\.(${GUIDE_LOCALE_PATTERN}))?(\\.html)([?#].*)?$`),
  );
  if (!match) return null;
  return {
    base: match[1],
    extension: match[3],
    suffix: match[4] || '',
  };
}

export function getLocalizedGuidePath(path, locale) {
  if (typeof path !== 'string') return path;
  const directory = path.match(/^((?:.*\/)?guides\/?)([?#].*)?$/);
  if (directory) {
    if (!GUIDE_LOCALES.has(locale)) return path;
    return `${directory[1]}index.${locale}.html${directory[2] || ''}`;
  }

  const guide = getBaseGuidePath(path);
  if (!guide) return path;
  const localized = GUIDE_LOCALES.has(locale) ? `.${locale}` : '';
  return `${guide.base}${localized}${guide.extension}${guide.suffix}`;
}

export function localizeGuideLinks(document, locale) {
  document?.querySelectorAll?.('a[href]').forEach((link) => {
    const href = link.getAttribute('href');
    if (!/^(?:\.\/)?guides(?:\/|$)/.test(href || '')) return;
    link.setAttribute('href', getLocalizedGuidePath(href, locale));
  });
}
