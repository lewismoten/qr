import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { format } from 'prettier';

import {
  GUIDE_LANGUAGE_LABELS,
  GUIDE_LOCALES,
} from '../src/js/i18n/guide-routes.js';
import { localizeNavigationHash } from '../src/js/i18n/guide-path.js';
import {
  configuredGuidePath,
  configuredGuideSource,
  loadHtmlConfig,
} from './html-config.mjs';
import {
  loadGuideTranslationSet,
  translateGuideHtml,
} from './guide-translations.mjs';
import { writeGuideSitemap } from './guide-sitemap.mjs';

const SITE_URL = 'https://qr.lewismoten.com/';
const TRANSLATED_LOCALES = ['ar', 'es', 'hi-IN', 'zh-CN'];
const LANGUAGE_HEADINGS = {
  'en-US': 'Languages',
  es: 'Idiomas',
  ar: 'اللغات',
  'hi-IN': 'भाषाएँ',
  'zh-CN': '语言',
};

function relativeUrl(fromFile, target) {
  const value = path.relative(path.dirname(fromFile), target);
  return value.startsWith('.') ? value : `./${value}`;
}

function splitUrl(value) {
  const index = value.search(/[?#]/);
  return index < 0 ? [value, ''] : [value.slice(0, index), value.slice(index)];
}

function routeBySource(config) {
  return new Map(
    Object.entries(config.guides).map(([route, source]) => [
      path.normalize(source),
      route,
    ]),
  );
}

function resolveSourceTarget(file, pathname) {
  const rootAsset = pathname.match(/(?:^|\/)dist\/(.+)$/);
  if (rootAsset) return path.join('dist', rootAsset[1]);
  let target = path.normalize(path.join(path.dirname(file), pathname));
  if (target === 'guides') target = 'guides/index.html';
  return target;
}

function rewriteLocalUrl(value, context) {
  if (/^(?:[a-z]+:|#|\/\/)/i.test(value)) return value;
  const [pathname, suffix] = splitUrl(value);
  const target = resolveSourceTarget(context.file, pathname);
  const route = context.routes.get(target);
  const outputTarget = route
    ? configuredGuidePath(context.config, route, context.locale)
    : target;
  const localizedSuffix = suffix.startsWith('#tab=')
    ? localizeNavigationHash(suffix, context.locale)
    : suffix;
  return relativeUrl(context.output, outputTarget) + localizedSuffix;
}

function rewriteLocalUrls(source, context) {
  const attributes = source.replace(
    /\b(href|src)=(['"])(.*?)\2/g,
    (attribute, name, quote, value) => {
      const rewritten = rewriteLocalUrl(value, context);
      return `${name}=${quote}${rewritten}${quote}`;
    },
  );
  return attributes.replace(
    /(["'])((?:\.\.\/)+dist\/[^"']+)\1/g,
    (match, quote, value) => {
      const target = resolveSourceTarget(context.file, value);
      return `${quote}${relativeUrl(context.output, target)}${quote}`;
    },
  );
}

function absoluteGuideUrl(config, route, locale) {
  const output = configuredGuidePath(config, route, locale);
  const publicPath =
    route === 'index' ? output.replace(/index\.html$/, '') : output;
  return new URL(publicPath, SITE_URL).href;
}

function alternateLinks(config, route) {
  const links = GUIDE_LOCALES.map((locale) => {
    const href = absoluteGuideUrl(config, route, locale);
    return `<link rel="alternate" hreflang="${locale}" href="${href}" />`;
  });
  links.push(
    `<link rel="alternate" hreflang="x-default" ` +
      `href="${absoluteGuideUrl(config, route, 'en-US')}" />`,
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

function localizeMetadata(source, context) {
  const direction = context.locale === 'ar' ? ' dir="rtl"' : '';
  const localeBase = `${relativeUrl(context.output, 'locales')}/`;
  const canonical = absoluteGuideUrl(
    context.config,
    context.route,
    context.locale,
  );
  return source
    .replace(
      /<html lang="[^"]+"(?: dir="[^"]+")?[^>]*>/,
      `<html lang="${context.locale}"${direction} ` +
        `data-guide-locale="${context.locale}" ` +
        `data-locale-base="${localeBase}">`,
    )
    .replace(
      /(<link\s+rel="canonical"\s+href=")[^"]+("\s*\/?>)/,
      `$1${canonical}$2`,
    )
    .replace(
      '</head>',
      `  ${alternateLinks(context.config, context.route)}\n  </head>`,
    );
}

function languageSwitcher(context) {
  const links = GUIDE_LOCALES.map((targetLocale) => {
    const [flag, name] = GUIDE_LANGUAGE_LABELS[targetLocale];
    const target = configuredGuidePath(
      context.config,
      context.route,
      targetLocale,
    );
    const current =
      targetLocale === context.locale ? ' aria-current="page"' : '';
    return (
      `<a href="${relativeUrl(context.output, target)}" ` +
      `hreflang="${targetLocale}" lang="${targetLocale}"${current}>` +
      `<span aria-hidden="true">${flag}</span> ${name}</a>`
    );
  }).join('');
  const heading = LANGUAGE_HEADINGS[context.locale] || 'Languages';
  const [flag, name] = GUIDE_LANGUAGE_LABELS[context.locale];
  return (
    '<!-- generated-guide-languages:start -->' +
    '<details class="guide-language-switcher">' +
    `<summary aria-label="${heading}">` +
    `<span aria-hidden="true">${flag}</span> ${name}</summary>` +
    `<nav aria-label="${heading}">${links}</nav></details>` +
    '<!-- generated-guide-languages:end -->'
  );
}

async function translate(source, context) {
  if (context.locale === 'en-US') return source;
  const directory = path.join(context.config.sourceRoot, 'guides/translations');
  const translations = await loadGuideTranslationSet(directory, context.locale);
  const missing = new Set();
  const result = translateGuideHtml(source, translations, missing);
  if (missing.size && context.route !== 'privacy') {
    const examples = [...missing].slice(0, 3).join(' | ');
    throw new Error(
      `${context.locale} is missing ${missing.size} translations: ${examples}`,
    );
  }
  return result;
}

async function writeGuide(source, context) {
  let result = await translate(stripGeneratedMarkup(source), context);
  result = localizeMetadata(result, context);
  result = rewriteLocalUrls(result, context);
  result = result.replace('</footer>', `${languageSwitcher(context)}</footer>`);
  result = await format(result, {
    parser: 'html',
    printWidth: 80,
    singleQuote: true,
  });
  const destination = path.join(context.config.outputRoot, context.output);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, result);
}

async function copyPages(config) {
  await Promise.all(
    Object.entries(config.pages).map(async ([output, source]) => {
      const input = path.join(config.sourceRoot, source);
      const destination = path.join(config.outputRoot, output);
      await mkdir(path.dirname(destination), { recursive: true });
      await writeFile(destination, await readFile(input, 'utf8'));
    }),
  );
}

export async function generateLocalizedGuides(options = {}) {
  const config = await loadHtmlConfig();
  if (options.clean) {
    await rm(config.outputRoot, { force: true, recursive: true });
  }
  const routes = routeBySource(config);
  const routeNames = Object.keys(config.guides);
  const sources = new Map(
    await Promise.all(
      routeNames.map(async (route) => [
        route,
        await readFile(configuredGuideSource(config, route), 'utf8'),
      ]),
    ),
  );
  await copyPages(config);
  const locales = ['en-US', ...TRANSLATED_LOCALES];
  await Promise.all(
    routeNames.flatMap((route) =>
      locales.map((locale) =>
        writeGuide(sources.get(route), {
          config,
          file: config.guides[route],
          locale,
          output: configuredGuidePath(config, route, locale),
          route,
          routes,
        }),
      ),
    ),
  );
  await writeGuideSitemap(config);
  return routeNames.length * locales.length;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const count = await generateLocalizedGuides({ clean: true });
  console.log(`Generated ${count} localized guide pages.`);
}
