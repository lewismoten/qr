import assert from 'node:assert/strict';
import { test } from 'node:test';

import { getLocalizedGuidePath } from '../src/js/i18n/guide-path.js';

test('guide paths select translated copies and preserve fallbacks', () => {
  assert.equal(
    getLocalizedGuidePath('guides/content/wifi.html', 'es'),
    'guides/content/wifi.es.html',
  );
  assert.equal(
    getLocalizedGuidePath('guides/about.html?embed=1', 'ar'),
    'guides/about.ar.html?embed=1',
  );
  assert.equal(
    getLocalizedGuidePath('guides/spec.zh-CN.html', 'zh-CN'),
    'guides/spec.zh-CN.html',
  );
  assert.equal(
    getLocalizedGuidePath('guides/spec.html', 'en-GB'),
    'guides/spec.html',
  );
  assert.equal(getLocalizedGuidePath('guides/', 'es'), 'guides/');
  assert.equal(getLocalizedGuidePath(undefined, 'es'), undefined);
});
