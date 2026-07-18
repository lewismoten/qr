import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { XMLParser, XMLValidator } from 'fast-xml-parser';

import { generateLocalizedGuides } from './generate-localized-guides.mjs';
import { loadHtmlConfig } from './html-config.mjs';

function parseXml(source, file) {
  const validation = XMLValidator.validate(source);
  if (validation !== true) {
    throw new Error(`${file}: ${validation.err.msg}`);
  }
  return new XMLParser().parse(source);
}

function validateUrl(loc, file, index) {
  const url = new URL(loc);
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error(`${file}: URL ${index + 1} must use HTTP or HTTPS.`);
  }
  return url;
}

const config = await loadHtmlConfig();
await generateLocalizedGuides({ clean: true });
const sitemapPath = path.join(config.outputRoot, 'sitemap.xml');
const sitemapSource = await readFile(sitemapPath, 'utf8');
const sitemap = parseXml(sitemapSource, sitemapPath);
const sitemapFiles = [].concat(sitemap.sitemapindex?.sitemap || []);
const entries = [].concat(sitemap.urlset?.url || []);
for (const [index, entry] of sitemapFiles.entries()) {
  const url = validateUrl(entry.loc, sitemapPath, index);
  const file = decodeURIComponent(url.pathname.replace(/^\//, ''));
  const outputFile = path.join(config.outputRoot, file);
  const source = await readFile(outputFile, 'utf8');
  const child = parseXml(source, outputFile);
  entries.push(...[].concat(child.urlset?.url || []));
}
if (!entries.length) {
  throw new Error(`${sitemapPath}: expected at least one URL entry.`);
}
entries.forEach(({ loc }, index) => validateUrl(loc, sitemapPath, index));

const robotsSource = await readFile('robots.txt', 'utf8');
const directives = robotsSource
  .split(/\r?\n/)
  .map((line) => line.replace(/#.*$/, '').trim())
  .filter(Boolean)
  .map((line) => {
    const separator = line.indexOf(':');
    if (separator < 1)
      throw new Error(`robots.txt: invalid directive "${line}".`);
    return [
      line.slice(0, separator).trim().toLowerCase(),
      line.slice(separator + 1).trim(),
    ];
  });

if (!directives.some(([name, value]) => name === 'user-agent' && value)) {
  throw new Error('robots.txt: expected a User-agent directive.');
}
const sitemapDirective = directives.find(([name]) => name === 'sitemap');
if (!sitemapDirective)
  throw new Error('robots.txt: expected a Sitemap directive.');
new URL(sitemapDirective[1]);

console.log(
  `Web metadata passed for ${entries.length} sitemap URLs and ${directives.length} robots directives.`,
);
