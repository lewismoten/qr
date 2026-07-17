import { readFile } from 'node:fs/promises';
import { XMLParser, XMLValidator } from 'fast-xml-parser';

const sitemapSource = await readFile('sitemap.xml', 'utf8');
const sitemapValidation = XMLValidator.validate(sitemapSource);
if (sitemapValidation !== true) {
  throw new Error(`sitemap.xml: ${sitemapValidation.err.msg}`);
}

const sitemap = new XMLParser().parse(sitemapSource);
const entries = [].concat(sitemap.urlset?.url || []);
if (!entries.length) throw new Error('sitemap.xml: expected at least one URL entry.');
entries.forEach(({ loc }, index) => {
  const url = new URL(loc);
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error(`sitemap.xml: URL ${index + 1} must use HTTP or HTTPS.`);
  }
});

const robotsSource = await readFile('robots.txt', 'utf8');
const directives = robotsSource
  .split(/\r?\n/)
  .map((line) => line.replace(/#.*$/, '').trim())
  .filter(Boolean)
  .map((line) => {
    const separator = line.indexOf(':');
    if (separator < 1) throw new Error(`robots.txt: invalid directive "${line}".`);
    return [line.slice(0, separator).trim().toLowerCase(), line.slice(separator + 1).trim()];
  });

if (!directives.some(([name, value]) => name === 'user-agent' && value)) {
  throw new Error('robots.txt: expected a User-agent directive.');
}
const sitemapDirective = directives.find(([name]) => name === 'sitemap');
if (!sitemapDirective) throw new Error('robots.txt: expected a Sitemap directive.');
new URL(sitemapDirective[1]);

console.log(`Web metadata passed for ${entries.length} sitemap URLs and ${directives.length} robots directives.`);
