import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  collectGuideText,
  loadGuideTranslationSet,
  translateGuideHtml,
} from '../scripts/guide-translations.mjs';

const locales = ['ar', 'es', 'hi-IN', 'zh-CN'];
const localizedName = /\.(?:ar|es|hi-IN|zh-CN)\.html$/;

async function listEnglishGuides(directory = 'guides') {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const file = `${directory}/${entry.name}`;
      if (entry.isDirectory()) {
        return entry.name === 'translations' ? [] : listEnglishGuides(file);
      }
      return file.endsWith('.html') && !localizedName.test(file) ? [file] : [];
    }),
  );
  return files.flat();
}

test('guide translation preserves code and keyed UI content', () => {
  const source = [
    '<p title="Useful help">Translate this.</p>',
    '<code>FILE:1:S</code>',
    '<span data-i18n="common.open">Open</span>',
  ].join('');
  const translations = {
    'Translate this.': 'Traducir esto.',
    'Useful help': 'Ayuda util',
  };
  const result = translateGuideHtml(source, translations);

  assert.match(result, /title="Ayuda util">Traducir esto\.<\/p>/);
  assert.match(result, /<code>FILE:1:S<\/code>/);
  assert.match(result, />Open<\/span>/);
});

test('guide translation reports missing prose without changing it', () => {
  const source = '<p>Missing guide prose.</p><p>123</p>';

  assert.deepEqual(collectGuideText(source), ['Missing guide prose.']);
  assert.equal(translateGuideHtml(source, {}), source);
});

test('every supported locale translates all long-form guide prose', async () => {
  const files = await listEnglishGuides();
  const required = new Set();
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    collectGuideText(source).forEach((value) => required.add(value));
  }

  for (const locale of locales) {
    const source = await readFile(`guides/translations/${locale}.json`);
    const translations = JSON.parse(source);
    const missing = [...required].filter((value) => !translations[value]);
    assert.deepEqual(missing, [], `${locale} has untranslated guide prose`);
  }
});

test('reviewed guide translations override machine output', async () => {
  const machine = JSON.parse(
    await readFile('guides/translations/es.json', 'utf8'),
  );
  const reviewed = JSON.parse(
    await readFile('guides/translations/es.reviewed.json', 'utf8'),
  );
  const translations = await loadGuideTranslationSet(
    'guides/translations',
    'es',
  );

  const unknown = Object.keys(reviewed).filter((key) => !(key in machine));
  assert.deepEqual(unknown, []);
  assert.equal(translations.Mask, 'Máscara');
  assert.equal(translations['Open generator'], 'Abrir el generador');
});

test('Spanish inline prose remains grammatical after HTML assembly', async () => {
  const technology = await readFile('guides/technology.es.html', 'utf8');
  const specification = await readFile('guides/spec.es.html', 'utf8');

  assert.match(
    technology,
    /utiliza una URL <code>data:<\/code> con Base64 estándar/,
  );
  assert.match(
    technology,
    /parámetro\s+<code>q<\/code> como convención de consulta habitual/,
  );
  assert.match(
    technology,
    /convención\s+<code>SMSTO:<\/code> para preparar mensajes/,
  );
  assert.match(
    specification,
    /<code>0x11<\/code>\s+para completar la capacidad\s+de datos/,
  );
});

test('Spanish guides use native QR and interface terminology', async () => {
  const files = await listEnglishGuides();
  const pages = await Promise.all(
    files.map((file) => readFile(file.replace(/\.html$/, '.es.html'), 'utf8')),
  );
  const source = pages.join('\n');
  const machinePhrases = [
    /palabras código/i,
    /niveles? de recuperación/i,
    /arte píxel/i,
    /URL de tipo blob/i,
    /formato Geo/i,
    /datos sin enmascarar/i,
    /Volver a la parte superior/i,
    /Abrir generador/i,
    /flujo más corto/i,
    /Una máscara obligatoria/i,
    /elige la puntuación de penalización más baja/i,
    /orden de colocación(?! de los módulos)/i,
    /tolerancia del escaneo/i,
    /La representación de códigos QR/i,
    /a su propio servidor/i,
    /hasta que se abre Geo/i,
  ];

  machinePhrases.forEach((phrase) => assert.doesNotMatch(source, phrase));
  assert.match(source, /niveles de corrección de errores/i);
  assert.match(source, /palabras de código/i);
  assert.match(source, /URL de objeto Blob/i);
  assert.match(source, /secuencia de bits más corta/i);
  assert.match(source, /menor puntuación de\s+penalización/i);
});
