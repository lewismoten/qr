import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { GUIDE_LOCALES } from '../../src/js/i18n/guide-routes.js';
import { configuredGuidePath } from './html-config.mjs';

const SITE_URL = 'https://qr.lewismoten.com/';
const PAGE_LOCALES = ['en-US', 'en-GB', 'es', 'ar', 'hi-IN', 'zh-CN'];

function guideUrl(config, route, locale) {
  const output = configuredGuidePath(config, route, locale);
  const publicPath =
    route === 'index' ? output.replace(/index\.html$/, '') : output;
  return new URL(publicPath, SITE_URL).href;
}

function guideEntry(config, route, locale, date) {
  const alternates = GUIDE_LOCALES.map(
    (alternate) =>
      `    <xhtml:link rel="alternate" hreflang="${alternate}" ` +
      `href="${guideUrl(config, route, alternate)}" />`,
  );
  alternates.push(
    '    <xhtml:link rel="alternate" hreflang="x-default" ' +
      `href="${guideUrl(config, route, 'en-US')}" />`,
  );
  return [
    '  <url>',
    `    <loc>${guideUrl(config, route, locale)}</loc>`,
    `    <lastmod>${date}</lastmod>`,
    ...alternates,
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

export async function writeGuideSitemap(config) {
  const date = new Date().toISOString().slice(0, 10);
  const directory = path.join(config.outputRoot, 'sitemaps');
  await mkdir(directory, { recursive: true });
  const siteFile = 'sitemaps/site.xml';
  const simple = [''].map((value) =>
    [
      '  <url>',
      `    <loc>${new URL(value, SITE_URL).href}</loc>`,
      `    <lastmod>${date}</lastmod>`,
      '  </url>',
    ].join('\n'),
  );
  await writeFile(path.join(config.outputRoot, siteFile), urlSet(simple));
  const localeFiles = await Promise.all(
    PAGE_LOCALES.map(async (locale) => {
      const file = `sitemaps/guides-${locale}.xml`;
      const entries = Object.keys(config.guides).map((route) =>
        guideEntry(config, route, locale, date),
      );
      await writeFile(path.join(config.outputRoot, file), urlSet(entries));
      return file;
    }),
  );
  await writeFile(
    path.join(config.outputRoot, 'sitemap.xml'),
    sitemapIndex([siteFile, ...localeFiles], date),
  );
}
