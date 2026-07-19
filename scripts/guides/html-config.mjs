import path from 'node:path';

import { loadSimpleYaml } from './simple-yaml.mjs';

export async function loadHtmlConfig(file = 'src/html/site.yaml') {
  return loadSimpleYaml(file);
}

export function configuredGuidePath(config, route, locale = 'en-US') {
  const localeConfig = config.locales[locale] || config.locales['en-US'];
  const segments = route === 'index' ? [] : route.split('/');
  const translated = config.segments?.[locale] || {};
  const parts = segments.map((part) => translated[part] || part);
  if (config.standalone?.[route]) {
    const prefix = locale === 'en-US' ? [] : [locale];
    return [...prefix, ...parts].join('/') + '.html';
  }
  const base = [localeConfig.root, ...parts].join('/');
  return route === 'index' ? `${base}/index.html` : `${base}.html`;
}

export function configuredGuideSource(config, route) {
  return path.join(config.sourceRoot, config.guides[route]);
}
