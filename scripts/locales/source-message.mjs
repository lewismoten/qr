import { assembleLocaleResource, readLocaleManifest } from './resources.mjs';
import { GUIDE_COPY_KEYS } from '../../src/js/i18n/guide-copy-keys.js';

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
  const entries = await Promise.all([
    getSourceMessage(
      locale,
      GUIDE_COPY_KEYS.externalEnglish,
      'The linked resource is available in English',
    ),
    getSourceMessage(locale, GUIDE_COPY_KEYS.languages, 'Languages'),
    getSourceMessage(locale, 'footer.navigationLabel', 'Site information'),
    getSourceMessage(locale, 'info.guides.generator', 'Generator'),
    getSourceMessage(locale, 'footer.guides', 'Guides'),
    getSourceMessage(locale, 'footer.specification', 'QR spec'),
    getSourceMessage(locale, 'footer.about', 'About'),
    getSourceMessage(locale, 'footer.privacy', 'Privacy'),
  ]);
  const keys = [
    'externalEnglish',
    'languages',
    'navigationLabel',
    'generator',
    'guides',
    'spec',
    'about',
    'privacy',
  ];
  return Object.fromEntries(keys.map((key, index) => [key, entries[index]]));
}
