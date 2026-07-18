import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, test } from 'node:test';

const root = new URL('../', import.meta.url);

async function read(path) {
  return readFile(new URL(path, root), 'utf8');
}

describe('standalone guide forms', () => {
  test('reveals content formats without changing app visibility', async () => {
    const css = await read('src/css/app/info-shell.css');
    const wifi = await read('guides/content/wifi.html');

    assert.match(
      wifi,
      /data-app-fragment=[^>]+format-fields|format-fields[^>]+data-app-fragment=/s,
    );
    assert.match(css, /\.info-page-body \[data-app-fragment\]\.format-fields/);
    assert.match(css, /\.format-fields \{\s*display: grid;/);
  });

  test('reveals conditional controls only within guide pages', async () => {
    const css = await read('src/css/app/info-shell.css');
    const paths = [
      'guides/content/frame.html',
      'guides/content/file.html',
      'guides/style/modules.html',
      'guides/style/colors.html',
      'guides/style/artwork.html',
      'guides/download/image.html',
    ];

    assert.match(css, /\.guide-only \{\s*display: none;/);
    assert.match(css, /\.info-page-body \[data-guide-reveal\]\[hidden\]/);
    for (const path of paths) {
      const page = await read(path);
      assert.match(page, /data-guide-reveal[^>]*hidden/s, path);
    }
  });

  test('documents each artwork mode while app switching stays intact', async () => {
    const artwork = await read('guides/style/artwork.html');
    const controls = await read('src/js/app/ui/style/art/controls.js');

    for (const name of ['Logo', 'Emoji', 'Pixel art']) {
      assert.match(artwork, new RegExp(`guide-control-heading[^>]*>${name}<`));
    }
    assert.match(controls, /logoControls\.hidden = mode !== 'logo'/);
    assert.match(controls, /emojiControls\.hidden = mode !== 'emoji'/);
    assert.match(controls, /pixelControls\.hidden = mode !== 'pixel'/);
  });
});
