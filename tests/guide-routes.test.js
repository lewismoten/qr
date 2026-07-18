import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  getGuideOutputPath,
  getGuidePublicPath,
  getGuideRouteFromPath,
} from '../src/js/i18n/guide-routes.js';

test('guide route helpers cover native, default, and legacy paths', () => {
  assert.equal(getGuideOutputPath('index'), 'guides/index.html');
  assert.equal(getGuidePublicPath('index'), 'guides/');
  assert.equal(
    getGuideOutputPath('content/wifi', 'es'),
    'es/guias/contenido/wifi.html',
  );
  assert.equal(
    getGuideRouteFromPath('/es/guias/especificacion-qr.html'),
    'spec',
  );
  assert.equal(getGuideRouteFromPath('./guides/'), 'index');
  assert.equal(getGuideRouteFromPath('guides/spec.es.html'), 'spec');
  assert.equal(getGuideRouteFromPath('guides/unknown.es.html'), null);
  assert.equal(getGuideRouteFromPath(null), null);
});
