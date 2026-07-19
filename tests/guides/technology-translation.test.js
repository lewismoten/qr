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
  assert.match(copy, /Datos y servicios cartográficos/);
  assert.match(copy, /generalizado deliberadamente/);
  assert.match(copy, /no para usos jurídicos ni de alta precisión/);
  assert.doesNotMatch(copy, />Código propio</);
});

test('localized technology pages explain every map source', async () => {
  const expectations = {
    'en-US': /deliberately generalized/,
    'en-GB': /deliberately generalised/,
    ar: /جرى تعميم السواحل والحدود عمدًا/,
    es: /se han generalizado deliberadamente/,
    'hi-IN': /जानबूझकर सामान्यीकृत किया गया है/,
    'zh-CN': /海岸线与边界经过有意概化/,
  };

  for (const [locale, wording] of Object.entries(expectations)) {
    const route = getGuideOutputPath('technology', locale);
    const source = await readFile(`build/site/${route}`, 'utf8');
    const copy = source.replaceAll(/\s+/g, ' ');
    assert.match(copy, /Natural Earth/);
    assert.match(copy, /TIGERweb/);
    assert.match(copy, /OpenStreetMap/);
    assert.match(copy, wording);
  }
});
