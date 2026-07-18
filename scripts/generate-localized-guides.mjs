import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { format } from 'prettier';

import {
  loadGuideTranslations,
  translateGuideHtml,
} from './guide-translations.mjs';

const GUIDE_ROOT = 'guides';
const LOCALES = ['ar', 'es', 'hi-IN', 'zh-CN'];
const localeSuffix = new RegExp(String.raw`\.(${LOCALES.join('|')})\.html$`);

async function listHtmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const file = path.join(directory, entry.name);
      return entry.isDirectory()
        ? listHtmlFiles(file)
        : file.endsWith('.html') && !localeSuffix.test(file)
          ? [file]
          : [];
    }),
  );
  return nested.flat();
}

function localizedFile(file, locale) {
  return file.replace(/\.html$/, `.${locale}.html`);
}

function relativeUrl(fromFile, target) {
  const value = path.relative(path.dirname(fromFile), target);
  return value.startsWith('.') ? value : `./${value}`;
}

function localizeGuideLinks(source, file, locale, guideFiles) {
  return source.replace(/href="([^"]+)"/g, (attribute, href) => {
    if (/^(?:[a-z]+:|#)/i.test(href)) return attribute;
    const [pathname, suffix = ''] = href.split(/(?=[?#])/);
    const target = path.normalize(path.join(path.dirname(file), pathname));
    if (!guideFiles.has(target)) return attribute;
    return `href="${pathname.replace(/\.html$/, `.${locale}.html`)}${suffix}"`;
  });
}

function localizeMetadata(source, file, locale) {
  const direction = locale === 'ar' ? ' dir="rtl"' : '';
  const localeBase = `${relativeUrl(file, 'locales')}/`;
  return source
    .replace(
      /<html lang="[^"]+"(?: dir="[^"]+")?>/,
      `<html lang="${locale}"${direction} ` +
        `data-guide-locale="${locale}" ` +
        `data-locale-base="${localeBase}">`,
    )
    .replace(
      /(<link\s+rel="canonical"\s+href=")([^"]+?)(\.html)?("\s*\/?>)/,
      (match, start, url, extension = '', end) =>
        extension
          ? `${start}${url}.${locale}${extension}${end}`
          : `${start}${url}${end}`,
    );
}

function ensureLocalizationScript(source, file) {
  if (/dist\/(?:info|spec)\.min\.js/.test(source)) return source;
  const script = relativeUrl(file, 'dist/info.min.js');
  return source.replace(
    '</body>',
    `    <script type="module" src="${script}"></script>\n  </body>`,
  );
}

export async function generateLocalizedGuides() {
  const files = await listHtmlFiles(GUIDE_ROOT);
  const guideFiles = new Set(files.map((file) => path.normalize(file)));
  const translations = Object.fromEntries(
    await Promise.all(
      LOCALES.map(async (locale) => [
        locale,
        await loadGuideTranslations(
          path.join(GUIDE_ROOT, 'translations', `${locale}.json`),
        ),
      ]),
    ),
  );
  await Promise.all(
    files.flatMap((file) =>
      LOCALES.map(async (locale) => {
        let source = await readFile(file, 'utf8');
        source = localizeGuideLinks(source, file, locale, guideFiles);
        source = localizeMetadata(source, file, locale);
        source = ensureLocalizationScript(source, file);
        const missing = new Set();
        source = translateGuideHtml(source, translations[locale], missing);
        if (missing.size) {
          throw new Error(
            `${locale} is missing ${missing.size} guide translations.`,
          );
        }
        source = await format(source, {
          parser: 'html',
          printWidth: 80,
          singleQuote: true,
        });
        await writeFile(localizedFile(file, locale), source);
      }),
    ),
  );
  return files.length * LOCALES.length;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const count = await generateLocalizedGuides();
  console.log(`Generated ${count} localized guide copies.`);
}
