import { mkdir, writeFile } from 'node:fs/promises';

import {
  GUIDE_LOCALES,
  GUIDE_ROUTES,
  getGuidePublicPath,
} from '../src/js/i18n/guide-routes.js';

const SITE_URL = 'https://qr.lewismoten.com/';
const PAGE_LOCALES = ['en-US', 'es', 'ar', 'hi-IN', 'zh-CN'];

function absoluteGuideUrl(route, locale) {
  return new URL(getGuidePublicPath(route, locale), SITE_URL).href;
}

function alternateLinks(route) {
  const links = GUIDE_LOCALES.map((locale) => {
    const href = absoluteGuideUrl(route, locale);
    return `    <xhtml:link rel="alternate" hreflang="${locale}" href="${href}" />`;
  });
  links.push(
    '    <xhtml:link rel="alternate" hreflang="x-default" ' +
      `href="${absoluteGuideUrl(route, 'en-US')}" />`,
  );
  return links.join('\n');
}

function guideEntry(route, locale, date) {
  return [
    '  <url>',
    `    <loc>${absoluteGuideUrl(route, locale)}</loc>`,
    `    <lastmod>${date}</lastmod>`,
    alternateLinks(route),
    '  </url>',
  ].join('\n');
}

function simpleEntry(path, date) {
  return [
    '  <url>',
    `    <loc>${new URL(path, SITE_URL).href}</loc>`,
    `    <lastmod>${date}</lastmod>`,
    '  </url>',
  ].join('\n');
}

function urlSet(entries) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    '  xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    entries.join('\n'),
    '</urlset>',
    '',
  ].join('\n');
}

function sitemapIndex(files, date) {
  const entries = files.map((file) =>
    [
      '  <sitemap>',
      `    <loc>${new URL(file, SITE_URL).href}</loc>`,
      `    <lastmod>${date}</lastmod>`,
      '  </sitemap>',
    ].join('\n'),
  );
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    entries.join('\n'),
    '</sitemapindex>',
    '',
  ].join('\n');
}

export async function writeGuideSitemap(file = 'sitemap.xml') {
  const date = new Date().toISOString().slice(0, 10);
  await mkdir('sitemaps', { recursive: true });
  const siteFile = 'sitemaps/site.xml';
  await writeFile(
    siteFile,
    urlSet([simpleEntry('', date), simpleEntry('privacy.html', date)]),
  );
  const localeFiles = await Promise.all(
    PAGE_LOCALES.map(async (locale) => {
      const localeFile = `sitemaps/guides-${locale}.xml`;
      const entries = GUIDE_ROUTES.map((route) =>
        guideEntry(route, locale, date),
      );
      await writeFile(localeFile, urlSet(entries));
      return localeFile;
    }),
  );
  await writeFile(file, sitemapIndex([siteFile, ...localeFiles], date));
}
