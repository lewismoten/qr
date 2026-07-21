import { assembleLocaleResource, readLocaleManifest } from './resources.mjs';

const resources = new Map();

function readPath(resource, key) {
  return key.split('.').reduce((value, part) => value?.[part], resource);
}

function load(locale) {
  if (!resources.has(locale)) {
    resources.set(locale, assembleLocaleResource(locale));
  }
  return resources.get(locale);
}

export async function getSourceMessage(locale, key, fallback = '') {
  const local = await load(locale);
  const value = readPath(local, key);
  if (typeof value === 'string') return value;
  const baseline = await load('en-US');
  return readPath(baseline, key) ?? fallback;
}

export async function getSourceLanguageLabels() {
  const manifest = await readLocaleManifest();
  return Object.fromEntries(
    manifest.locales.map(({ code, flag, nativeName }) => [
      code,
      [flag, nativeName || code],
    ]),
  );
}

export async function getSourceGuideCopy(locale) {
  const [externalEnglish, languages] = await Promise.all([
    getSourceMessage(
      locale,
      'info.guides.externalEnglish',
      'The linked resource is available in English',
    ),
    getSourceMessage(locale, 'info.guides.languages', 'Languages'),
  ]);
  return { externalEnglish, languages };
}
