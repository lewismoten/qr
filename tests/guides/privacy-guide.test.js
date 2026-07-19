import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  collectGuideText,
  loadGuideTranslationSet,
} from '../../scripts/guides/guide-translations.mjs';
import { formatLocalizedDate } from '../../src/js/i18n/date.js';
import { getGuideOutputPath } from '../../src/js/i18n/guide-routes.js';

const sourceRoot = 'src/html/guides';
const privacySource = 'src/html/privacy.html';

function stripLanguageSwitcher(source) {
  return source.replace(
    /<!-- generated-guide-languages:start -->[\s\S]*?<!-- generated-guide-languages:end -->/g,
    '',
  );
}

test('reviewed translations include only known or privacy prose', async () => {
  const machine = JSON.parse(
    await readFile(`${sourceRoot}/translations/es.json`, 'utf8'),
  );
  const reviewed = JSON.parse(
    await readFile(`${sourceRoot}/translations/es.reviewed.json`, 'utf8'),
  );
  const translations = await loadGuideTranslationSet(
    `${sourceRoot}/translations`,
    'es',
  );
  const privacy = await readFile(privacySource, 'utf8');
  const privacyKeys = new Set(
    collectGuideText(privacy).map((key) => key.replace(/\s+/g, ' ').trim()),
  );
  const unknown = Object.keys(reviewed).filter(
    (key) =>
      !(key in machine) && !privacyKeys.has(key.replace(/\s+/g, ' ').trim()),
  );

  assert.deepEqual(unknown, []);
  assert.equal(translations.Mask, 'Máscara');
  assert.equal(translations['Open generator'], 'Abrir el generador');
});

test('Spanish privacy guide uses complete reviewed prose', async () => {
  const source = stripLanguageSwitcher(await readFile(privacySource, 'utf8'));
  const translations = await loadGuideTranslationSet(
    `${sourceRoot}/translations`,
    'es',
  );
  const missing = collectGuideText(source).filter((value) => {
    const normalized = value.replace(/\s+/g, ' ').trim();
    return !translations[value] && !translations[normalized];
  });

  assert.deepEqual(missing, []);

  const output = getGuideOutputPath('privacy', 'es');
  const generated = await readFile(`build/site/${output}`, 'utf8');
  const manifest = JSON.parse(await readFile('locales/manifest.json', 'utf8'));
  const copy = generated.replaceAll(/\s+/g, ' ');
  assert.match(copy, /Cómo trata este sitio su información/);
  assert.match(copy, /Información almacenada en su navegador/);
  assert.ok(
    copy.includes(
      formatLocalizedDate(manifest.documents.privacy.lastUpdated, 'es'),
    ),
  );
  assert.match(copy, /Cookies y seguimiento/);
  assert.match(copy, /Registros del servidor y de la red/);
  assert.match(
    copy,
    /protecciones <code>noopener<\/code> y <code>noreferrer<\/code>\./,
  );
  assert.match(copy, /URL <code>file:<\/code>, las reglas de seguridad/);
  assert.doesNotMatch(copy, /How this site handles your information/);
  assert.doesNotMatch(copy, /Information stored in your browser/);
});

test('privacy dates are generated from one locale-neutral value', async () => {
  const source = await readFile(privacySource, 'utf8');
  const manifest = JSON.parse(await readFile('locales/manifest.json', 'utf8'));
  const ukOutput = getGuideOutputPath('privacy', 'en-GB');
  const uk = await readFile(`build/site/${ukOutput}`, 'utf8');
  const ukDate = formatLocalizedDate(
    manifest.documents.privacy.lastUpdated,
    'en-GB',
  );

  assert.match(
    source,
    /<time data-document-date="privacy" data-localized-date><\/time>/,
  );
  assert.doesNotMatch(source, /July 17, 2026/);
  assert.match(
    uk,
    new RegExp(`datetime="${manifest.documents.privacy.lastUpdated}"`),
  );
  assert.ok(uk.replaceAll(/\s+/g, ' ').includes(`>${ukDate}</time`));
});

test('privacy source exposes both English language flags', async () => {
  const source = await readFile(privacySource, 'utf8');

  assert.match(source, /🇺🇸<\/span> English \(US\)/);
  assert.match(source, /🇬🇧<\/span> English \(UK\)/);
  assert.match(source, /hreflang="en-US"/);
  assert.match(source, /hreflang="en-GB"/);
  assert.match(source, /en-GB\/privacy\.html/);
});
