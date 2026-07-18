import { readFile } from 'node:fs/promises';

const BLOCKED_ELEMENTS = new Set(['code', 'pre', 'script', 'style']);
const TRANSLATED_ATTRIBUTES = new Set([
  'aria-description',
  'aria-label',
  'alt',
  'title',
]);

function isTranslatable(value) {
  return /[A-Za-z]{2}/.test(value);
}

function translateValue(value, translations, missing) {
  if (!isTranslatable(value)) return value;
  const translated = translations[value];
  if (translated === undefined) {
    missing?.add(value);
    return value;
  }
  return translated;
}

function escapeAttribute(value, quote) {
  const quotePattern = quote === '"' ? /"/g : /'/g;
  const quoteEntity = quote === '"' ? '&quot;' : '&#39;';
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(quotePattern, quoteEntity);
}

function escapeText(value) {
  return value
    .replace(/&(?!#\d+;|#x[\da-f]+;|[a-z]+;)/gi, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function translateAttributes(tag, translations, missing) {
  const isMeta = /^<meta\b/i.test(tag);
  const metaName = tag.match(/\bname=(['"])(.*?)\1/i)?.[2]?.toLowerCase();
  const translateContent =
    isMeta && ['description', 'keywords'].includes(metaName);

  return tag.replace(
    /\b([\w:-]+)=(['"])(.*?)\2/g,
    (attribute, name, quote, value) => {
      const normalized = name.toLowerCase();
      const keyed = new RegExp(`\\bdata-i18n-${normalized}=`).test(tag);
      const shouldTranslate =
        (!keyed && TRANSLATED_ATTRIBUTES.has(normalized)) ||
        (normalized === 'content' && translateContent);
      if (!shouldTranslate) return attribute;
      const translated = translateValue(value, translations, missing);
      return `${name}=${quote}${escapeAttribute(translated, quote)}${quote}`;
    },
  );
}

function getTagDetails(token) {
  const match = token.match(/^<\s*(\/)?\s*([\w:-]+)/);
  if (!match || /^<!/.test(token)) return null;
  return {
    closing: Boolean(match[1]),
    name: match[2].toLowerCase(),
    selfClosing: /\/\s*>$/.test(token),
  };
}

export function translateGuideHtml(source, translations, missing) {
  const stack = [];
  return source
    .split(/(<!--[\s\S]*?-->|<[^>]+>)/g)
    .map((token) => {
      if (!token) return token;
      if (!token.startsWith('<')) {
        if (!token.trim()) return token;
        const blocked = stack.some((entry) => entry.blocked || entry.keyed);
        if (blocked) return token;
        const leading = token.match(/^\s*/)[0];
        const trailing = token.match(/\s*$/)[0];
        const value = token.slice(
          leading.length,
          token.length - trailing.length,
        );
        const translated = translateValue(value, translations, missing);
        return `${leading}${escapeText(translated)}${trailing}`;
      }

      const details = getTagDetails(token);
      if (!details) return token;
      if (details.closing) {
        const index = stack.findLastIndex(
          (entry) => entry.name === details.name,
        );
        if (index >= 0) stack.splice(index);
        return token;
      }

      const keyed = /\bdata-i18n(?:-[\w-]+)?=/.test(token);
      if (!details.selfClosing) {
        stack.push({
          blocked: BLOCKED_ELEMENTS.has(details.name),
          keyed,
          name: details.name,
        });
      }
      return keyed ? token : translateAttributes(token, translations, missing);
    })
    .join('');
}

export function collectGuideText(source) {
  const missing = new Set();
  translateGuideHtml(source, {}, missing);
  return [...missing];
}

export async function loadGuideTranslations(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

export async function loadGuideTranslationSet(directory, locale) {
  const translations = await loadGuideTranslations(
    `${directory}/${locale}.json`,
  );
  try {
    const reviewed = await loadGuideTranslations(
      `${directory}/${locale}.reviewed.json`,
    );
    return { ...translations, ...reviewed };
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return translations;
  }
}
