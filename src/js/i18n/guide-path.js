import {
  getGuidePublicPath,
  getGuideRouteFromPath,
  NAVIGATION_ALIASES,
} from './guide-routes.js';

function splitSuffix(path) {
  const index = path.search(/[?#]/);
  return index < 0 ? [path, ''] : [path.slice(0, index), path.slice(index)];
}

function normalizeGuidePath(path) {
  return path.replace(/^\.\//, '').replace(/^\//, '');
}

export function getLocalizedGuidePath(path, locale) {
  if (typeof path !== 'string') return path;
  const [pathname, suffix] = splitSuffix(path);
  const normalized = normalizeGuidePath(pathname);
  const directoryRoute = /^guides\/?$/.test(normalized) ? 'index' : null;
  const route = directoryRoute || getGuideRouteFromPath(normalized);
  if (!route) return path;
  return getGuidePublicPath(route, locale) + suffix;
}

function translateValue(values, value) {
  return values?.[value] || value;
}

export function localizeNavigationHash(hash, locale) {
  const aliases = NAVIGATION_ALIASES[locale];
  if (!aliases || !hash) return hash;
  const prefix = hash.startsWith('#') ? '#' : '';
  const value = hash.replace(/^#/, '').replaceAll('&amp;', '&');
  const parameters = new URLSearchParams(value);
  const tab = parameters.get('tab');
  const subtab = parameters.get('subtab');
  if (!tab) return hash;
  const localized = new URLSearchParams();
  localized.set(aliases.keys[0], translateValue(aliases.tabs, tab));
  if (subtab) {
    localized.set(aliases.keys[1], translateValue(aliases.subtabs, subtab));
  }
  return prefix + localized.toString();
}

export function localizeGuideLinks(document, locale) {
  document?.querySelectorAll?.('a[href]').forEach((link) => {
    if (link.getAttribute('hreflang')) return;
    const href = link.getAttribute('href');
    const localized = getLocalizedGuidePath(href, locale);
    if (localized !== href) link.setAttribute('href', localized);
  });
}
