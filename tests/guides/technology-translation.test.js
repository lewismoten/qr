import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { loadGuideTranslationSet } from '../../scripts/guides/guide-translations.mjs';
import { getGuideOutputPath } from '../../src/js/i18n/guide-routes.js';

test('Spanish technology copy uses reviewed technical terminology', async () => {
  const translations = await loadGuideTranslationSet(
    'src/html/guides/translations',
    'es',
    'technology',
  );
  const route = getGuideOutputPath('technology', 'es');
  const source = await readFile(`build/site/${route}`, 'utf8');
  const copy = source.replaceAll(/\s+/g, ' ');

  assert.equal(
    translations['First-party'],
    'Código desarrollado para el proyecto',
  );
  assert.match(copy, /Tecnologías, estándares y licencias/);
  assert.match(copy, /Implementación propia del código QR/);
  assert.match(copy, /Algoritmo implementado para el proyecto/);
  assert.match(copy, /Formatos de datos y transferencia/);
  assert.match(copy, /Formatos del IETF/);
  assert.match(copy, /<code>tel:<\/code> y las coordenadas/);
  assert.match(copy, /<code>TextDecoder<\/code> y muestra un error/);
  assert.match(copy, /un estándar del IETF específico/);
  assert.match(copy, /Un manifiesto opcional puede incluir/);
  assert.match(copy, /Servicios de datos y distribución/);
  assert.doesNotMatch(copy, />Código propio</);
});
