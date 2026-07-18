import {
  mkdir,
  readFile,
  readdir,
  rm,
  unlink,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { format } from 'prettier';

import {
  GUIDE_LANGUAGE_LABELS,
  GUIDE_LOCALES,
  GUIDE_ROUTES,
  getGuideOutputPath,
  getGuidePublicPath,
} from '../src/js/i18n/guide-routes.js';
import { localizeNavigationHash } from '../src/js/i18n/guide-path.js';
import {
  loadGuideTranslationSet,
  translateGuideHtml,
} from './guide-translations.mjs';
import { writeGuideSitemap } from './guide-sitemap.mjs';

const SITE_URL = 'https://qr.lewismoten.com/';
const TRANSLATED_LOCALES = ['ar', 'es', 'hi-IN', 'zh-CN'];
const LANGUAGE_HEADINGS = {
  'en-US': 'Languages',
  'en-GB': 'Languages',
  es: 'Idiomas',
  ar: 'اللغات',
  'hi-IN': 'भाषाएँ',
  'zh-CN': '语言',
};

function sourceFile(route) {
  return `guides/${route === 'index' ? 'index' : route}.html`;
}

function relativeUrl(fromFile, target) {
  const value = path.relative(path.dirname(fromFile), target);
  return value.startsWith('.') ? value : `./${value}`;
}

function splitUrl(value) {
  const index = value.search(/[?#]/);
  return index < 0 ? [value, ''] : [value.slice(0, index), value.slice(index)];
}

function routeBySource() {
  return new Map(
    GUIDE_ROUTES.map((route) => [path.normalize(sourceFile(route)), route]),
  );
}

function resolveSourceTarget(file, pathname) {
  const rootAsset = pathname.match(/(?:^|\/)dist\/(.+)$/);
  if (rootAsset) return path.join('dist', rootAsset[1]);
  let target = path.normalize(path.join(path.dirname(file), pathname));
  if (target === 'guides') target = 'guides/index.html';
  return target;
}

function rewriteLocalUrl(value, file, output, locale, routes) {
  if (/^(?:[a-z]+:|#|\/\/)/i.test(value)) return value;
  const [pathname, suffix] = splitUrl(value);
  const target = resolveSourceTarget(file, pathname);
  const route = routes.get(target);
  const outputTarget = route ? getGuideOutputPath(route, locale) : target;
  const localizedSuffix = suffix.startsWith('#tab=')
    ? localizeNavigationHash(suffix, locale)
    : suffix;
  return relativeUrl(output, outputTarget) + localizedSuffix;
}

function rewriteLocalUrls(source, file, output, locale, routes) {
  const attributes = source.replace(
    /\b(href|src)=(['"])(.*?)\2/g,
    (attribute, name, quote, value) => {
      const rewritten = rewriteLocalUrl(value, file, output, locale, routes);
      return `${name}=${quote}${rewritten}${quote}`;
    },
  );
  return attributes.replace(
    /(["'])((?:\.\.\/)+dist\/[^"']+)\1/g,
    (match, quote, value) => {
      const resolved = resolveSourceTarget(file, value);
      return `${quote}${relativeUrl(output, resolved)}${quote}`;
    },
  );
}

function absoluteGuideUrl(route, locale) {
  return new URL(getGuidePublicPath(route, locale), SITE_URL).href;
}

function alternateLinks(route) {
  const links = GUIDE_LOCALES.map((locale) => {
    const href = absoluteGuideUrl(route, locale);
    return `<link rel="alternate" hreflang="${locale}" href="${href}" />`;
  });
  links.push(
    `<link rel="alternate" hreflang="x-default" ` +
      `href="${absoluteGuideUrl(route, 'en-US')}" />`,
  );
  return (
    '<!-- generated-guide-alternates:start -->\n' +
    links.join('\n') +
    '\n<!-- generated-guide-alternates:end -->'
  );
}

function stripGeneratedMarkup(source) {
  return source
    .replace(
      /\s*<!-- generated-guide-alternates:start -->[\s\S]*?<!-- generated-guide-alternates:end -->/g,
      '',
    )
    .replace(
      /\s*<!-- generated-guide-languages:start -->[\s\S]*?<!-- generated-guide-languages:end -->/g,
      '',
    );
}

function localizeMetadata(source, route, output, locale) {
  const direction = locale === 'ar' ? ' dir="rtl"' : '';
  const localeBase = `${relativeUrl(output, 'locales')}/`;
  const canonical = absoluteGuideUrl(route, locale);
  const metadata = alternateLinks(route);
  return source
    .replace(
      /<html lang="[^"]+"(?: dir="[^"]+")?[^>]*>/,
      `<html lang="${locale}"${direction} ` +
        `data-guide-locale="${locale}" ` +
        `data-locale-base="${localeBase}">`,
    )
    .replace(
      /(<link\s+rel="canonical"\s+href=")[^"]+("\s*\/?>)/,
      `$1${canonical}$2`,
    )
    .replace('</head>', `  ${metadata}\n  </head>`);
}

function languageSwitcher(route, output, locale) {
  const links = GUIDE_LOCALES.map((targetLocale) => {
    const [flag, name] = GUIDE_LANGUAGE_LABELS[targetLocale];
    const target = getGuideOutputPath(route, targetLocale);
    const current = targetLocale === locale ? ' aria-current="page"' : '';
    return (
      `<a href="${relativeUrl(output, target)}" ` +
      `hreflang="${targetLocale}" lang="${targetLocale}"${current}>` +
      `<span aria-hidden="true">${flag}</span> ${name}</a>`
    );
  }).join('');
  const heading = LANGUAGE_HEADINGS[locale];
  const [currentFlag, currentName] = GUIDE_LANGUAGE_LABELS[locale];
  return (
    '<!-- generated-guide-languages:start -->' +
    `<details class="guide-language-switcher">` +
    `<summary aria-label="${heading}">` +
    `<span aria-hidden="true">${currentFlag}</span> ${currentName}</summary>` +
    `<nav aria-label="${heading}">${links}</nav></details>` +
    '<!-- generated-guide-languages:end -->'
  );
}

function addLanguageSwitcher(source, route, output, locale) {
  const switcher = languageSwitcher(route, output, locale);
  return source.replace('</footer>', `${switcher}</footer>`);
}

function ensureLocalizationScript(source, output) {
  if (/dist\/(?:info|spec)\.min\.js/.test(source)) return source;
  const script = relativeUrl(output, 'dist/info.min.js');
  return source.replace(
    '</body>',
    `    <script type="module" src="${script}"></script>\n  </body>`,
  );
}

async function writeGuide(source, route, output, locale, routes) {
  const file = sourceFile(route);
  let result = stripGeneratedMarkup(source);
  if (locale !== 'en-US' && locale !== 'en-GB') {
    const translations = await loadGuideTranslationSet(
      'guides/translations',
      locale,
    );
    const missing = new Set();
    result = translateGuideHtml(result, translations, missing);
    if (missing.size) {
      const examples = [...missing].slice(0, 3).join(' | ');
      throw new Error(
        `${locale} is missing ${missing.size} translations: ${examples}`,
      );
    }
  }
  result = localizeMetadata(result, route, output, locale);
  result = rewriteLocalUrls(result, file, output, locale, routes);
  result = ensureLocalizationScript(result, output);
  result = addLanguageSwitcher(result, route, output, locale);
  if (locale !== 'en-US') {
    result = await format(result, {
      parser: 'html',
      printWidth: 80,
      singleQuote: true,
    });
  }
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, result);
}

async function removeLegacyCopies(directory = 'guides') {
  const entries = await readdir(directory, { withFileTypes: true });
  await Promise.all(
    entries.map(async (entry) => {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) return removeLegacyCopies(file);
      if (/\.(?:ar|es|hi-IN|zh-CN)\.html$/.test(entry.name)) {
        await unlink(file);
      }
    }),
  );
}

export async function generateLocalizedGuides() {
  const routes = routeBySource();
  const sources = new Map(
    await Promise.all(
      GUIDE_ROUTES.map(async (route) => [
        route,
        await readFile(sourceFile(route), 'utf8'),
      ]),
    ),
  );
  await removeLegacyCopies();
  await Promise.all(
    TRANSLATED_LOCALES.map((locale) =>
      rm(path.dirname(getGuideOutputPath('index', locale)), {
        force: true,
        recursive: true,
      }),
    ),
  );
  await Promise.all(
    GUIDE_ROUTES.flatMap((route) => {
      const source = sources.get(route);
      const englishOutput = getGuideOutputPath(route, 'en-US');
      const tasks = [writeGuide(source, route, englishOutput, 'en-US', routes)];
      for (const locale of TRANSLATED_LOCALES) {
        const output = getGuideOutputPath(route, locale);
        tasks.push(writeGuide(source, route, output, locale, routes));
      }
      return tasks;
    }),
  );
  await writeGuideSitemap();
  return GUIDE_ROUTES.length * TRANSLATED_LOCALES.length;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const count = await generateLocalizedGuides();
  console.log(`Generated ${count} localized guide copies.`);
}
