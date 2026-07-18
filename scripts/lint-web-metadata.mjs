import { readFile } from 'node:fs/promises';
import { XMLParser, XMLValidator } from 'fast-xml-parser';

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

const sitemapSource = await readFile('sitemap.xml', 'utf8');
const sitemap = parseXml(sitemapSource, 'sitemap.xml');
const sitemapFiles = [].concat(sitemap.sitemapindex?.sitemap || []);
const entries = [].concat(sitemap.urlset?.url || []);
for (const [index, entry] of sitemapFiles.entries()) {
  const url = validateUrl(entry.loc, 'sitemap.xml', index);
  const file = decodeURIComponent(url.pathname.replace(/^\//, ''));
  const source = await readFile(file, 'utf8');
  const child = parseXml(source, file);
  entries.push(...[].concat(child.urlset?.url || []));
}
if (!entries.length) {
  throw new Error('sitemap.xml: expected at least one URL entry.');
}
entries.forEach(({ loc }, index) => validateUrl(loc, 'sitemap.xml', index));

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
