import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, test } from 'node:test';

const root = new URL('../../', import.meta.url);

async function read(path) {
  return readFile(new URL(path, root), 'utf8');
}

describe('standalone guide forms', () => {
  test('reveals content formats without changing app visibility', async () => {
    const css = await read('src/css/app/chrome/info-shell.css');
    const wifi = await read('src/html/guides/content/wifi.html');

    assert.match(
      wifi,
      /data-app-fragment=[^>]+format-fields|format-fields[^>]+data-app-fragment=/s,
    );
    assert.match(css, /\.info-page-body \[data-app-fragment\]\.format-fields/);
    assert.match(css, /\.format-fields \{\s*display: grid;/);
  });

  test('reveals conditional controls only within guide pages', async () => {
    const css = await read('src/css/app/chrome/info-shell.css');
    const paths = [
      'src/html/guides/content/frame.html',
      'src/html/guides/content/file.html',
      'src/html/guides/style/modules.html',
      'src/html/guides/style/colors.html',
      'src/html/guides/style/artwork.html',
      'src/html/guides/download/image.html',
    ];

    assert.match(css, /\.guide-only \{\s*display: none;/);
    assert.match(css, /\.info-page-body \[data-guide-reveal\]\[hidden\]/);
    for (const path of paths) {
      const page = await read(path);
      assert.match(page, /data-guide-reveal[^>]*hidden/s, path);
    }
  });

  test('documents each artwork mode while app switching stays intact', async () => {
    const artwork = await read('src/html/guides/style/artwork.html');
    const controls = await read('src/js/app/ui/style/art/controls.js');
    const css = await read('src/css/app/chrome/info-shell.css');
    const featureCss = await read('src/css/features/style/artwork.css');

    for (const name of ['Logo', 'Emoji', 'Pixel art']) {
      assert.match(artwork, new RegExp(`guide-control-heading[^>]*>${name}<`));
    }
    assert.equal(
      artwork.match(/class="guide-pixel-swatch(?: is-eraser)?"/g)?.length,
      17,
    );
    assert.match(artwork, /class="guide-only guide-pixel-sample"/);
    assert.equal(artwork.match(/guide-pixel-sample"/g)?.length, 1);
    assert.doesNotMatch(artwork, /guide-pixel-example/);
    assert.match(css, /\.info-page-body \[data-app-only\]/);
    assert.match(css, /\.guide-pixel-swatch\.is-eraser[\s\S]*grid-row: span 2/);
    assert.match(
      featureCss,
      /\.pixel-palette-button\.is-eraser[\s\S]*grid-row: span 2/,
    );
    assert.match(
      artwork,
      /id="pixel-art-palette"[\s\S]*?data-app-only[\s\S]*?aria-label="EGA paint colors"\s*><\/div>/,
    );
    assert.match(
      artwork,
      /id="pixel-art-grid"[\s\S]*?data-app-only[\s\S]*?aria-label="16 by 16 pixel art editor"\s*><\/div>/,
    );
    assert.match(controls, /logoControls\.hidden = mode !== 'logo'/);
    assert.match(controls, /emojiControls\.hidden = mode !== 'emoji'/);
    assert.match(controls, /pixelControls\.hidden = mode !== 'pixel'/);
  });

  test('uses a simplified local world map before network tiles', async () => {
    const geo = await read('src/html/guides/content/geo.html');
    const world = await read('src/assets/maps/world.svg');

    assert.match(geo, /src="\/maps\/world\.svg"/);
    assert.match(world, /class="geo-world-land"/);
    assert.match(world, /viewBox="0 0 1000 500"/);
    assert.match(
      geo,
      /id="geo-world-map"[\s\S]*?class="[^"]*is-map-visible[^"]*"/,
    );
    assert.match(geo, /id="geo-map"[\s\S]*?hidden/);
    assert.match(geo, /id="geo-map-consent"/);
    assert.match(geo, /id="geo-map-never-ask"/);
    assert.match(geo, /class="geo-layer-table"/);
    assert.equal(geo.match(/<td>\d{1,2}<\/td>/g)?.length, 19);
    assert.match(geo, /maps\/tiles\/1\/0\/0\.svg/);
    assert.match(geo, /maps\/tiles\/bundles\/9\/36\/48\.svg/);
    assert.match(geo, /maps\/tiles\/bundles\/11\/144\/195\.svg/);
    assert.equal(geo.match(/data-fallback-src=/g)?.length, 19);
    assert.doesNotMatch(geo, /<img src="\/maps\/tiles\//);
    assert.match(geo, /<figcaption>L12 · 1158\/1566<\/figcaption>/);
    assert.match(geo, /<figcaption>L13 · 2316\/3133<\/figcaption>/);
    assert.match(geo, /<figcaption>L14 · 4633\/6266<\/figcaption>/);
    assert.match(geo, /<figcaption>L15 · 9266\/12532<\/figcaption>/);
    assert.match(geo, /<figcaption>L16 · 18533\/25065<\/figcaption>/);
    assert.match(geo, /<figcaption>L17 · 37066\/50131<\/figcaption>/);
    assert.equal(
      geo.match(/<figcaption>L1[8-9] → L17<\/figcaption>/g)?.length,
      2,
    );
  });
});
