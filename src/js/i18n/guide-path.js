const GUIDE_LOCALES = new Set(['ar', 'es', 'hi-IN', 'zh-CN']);

export function getLocalizedGuidePath(path, locale) {
  if (!GUIDE_LOCALES.has(locale) || typeof path !== 'string') return path;
  const match = path.match(/^(.*?)(\.html)([?#].*)?$/);
  if (!match || match[1].endsWith(`.${locale}`)) return path;
  return `${match[1]}.${locale}${match[2]}${match[3] || ''}`;
}
