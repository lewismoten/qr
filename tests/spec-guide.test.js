import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { describe, test } from 'node:test';

const read = (path) => readFile(new URL('../' + path, import.meta.url), 'utf8');

describe('specification guide', () => {
  test('keeps the footer visible without covering page content', async () => {
    const [html, base, references] = await Promise.all([
      read('src/html/spec.html'),
      read('src/css/spec/base.css'),
      read('src/css/spec/references.css'),
    ]);
    assert.match(html, /<footer class="spec-footer">/);
    assert.match(html, /href="guides\/index\.html">Guides</);
    assert.match(base, /body \{[\s\S]*padding-bottom: 5rem;/);
    assert.match(references, /\.spec-footer \{[\s\S]*position: fixed;/);
    assert.match(references, /bottom: 0\.75rem;/);
  });

  test('shares the mask-preview blue throughout its visuals', async () => {
    const sources = await Promise.all([
      read('src/html/spec.html'),
      read('src/css/spec/base.css'),
      read('src/js/spec/visual-models.js'),
      read('src/js/app/ui/debug/mask-selector.js'),
    ]);
    sources.forEach((source) => assert.match(source, /#60a5fa/i));
    sources.forEach((source) => assert.doesNotMatch(source, /#2563eb/i));
  });

  test('links only to repository source files that exist', async () => {
    const html = await read('src/html/spec.html');
    const prefix = 'https://git.lewismoten.com/lewismoten/qr/src/branch/main/';
    const paths = [...html.matchAll(/href="([^"]+)"/g)]
      .map((match) => match[1])
      .filter((href) => href.startsWith(prefix))
      .map((href) => href.slice(prefix.length));
    assert.ok(paths.length >= 10);
    await Promise.all(
      paths.map((path) => access(new URL('../' + path, import.meta.url))),
    );
  });

  test('localizes dynamically generated encoding examples', async () => {
    const [source, localeSource] = await Promise.all([
      read('src/js/spec/encoding-examples.js'),
      read('locales/es.json'),
    ]);
    const locale = JSON.parse(localeSource);

    assert.match(source, /lookup\('spec\.mixed\.segment'/);
    assert.match(source, /lookup\(\s*'spec\.units\.numeric'/);
    assert.equal(locale.spec.mixed.segment, 'Segmento {number}');
    assert.equal(locale.spec.modes.byte, 'Modo de bytes');
    assert.equal(
      locale.spec.mixed.savings,
      '{mixed} bits frente a {bytes} si se utiliza únicamente el modo de bytes',
    );
    assert.equal(
      locale.spec.units.kanji,
      'El valor {value} de Shift JIS se transforma en un valor Kanji de 13 bits ' +
        'para el código QR.',
    );
    assert.match(locale.spec.units.byte, /los datos ocupan 16 bits/);
    assert.match(locale.spec.mixed.savings, /si se utiliza únicamente/);
  });
});
