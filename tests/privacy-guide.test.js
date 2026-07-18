import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  collectGuideText,
  loadGuideTranslationSet,
} from '../scripts/guide-translations.mjs';
import { getGuideOutputPath } from '../src/js/i18n/guide-routes.js';

const sourceRoot = 'src/html/guides';

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
  const privacySource = await readFile(`${sourceRoot}/privacy.html`, 'utf8');
  const privacyKeys = new Set(
    collectGuideText(privacySource).map((key) =>
      key.replace(/\s+/g, ' ').trim(),
    ),
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
  const source = await readFile(`${sourceRoot}/privacy.html`, 'utf8');
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
  const copy = generated.replaceAll(/\s+/g, ' ');
  assert.match(copy, /Cómo trata este sitio su información/);
  assert.match(copy, /Información almacenada en su navegador/);
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
