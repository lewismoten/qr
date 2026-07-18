import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  getLocalizedGuidePath,
  localizeGuideLinks,
} from '../src/js/i18n/guide-path.js';

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
  assert.equal(getLocalizedGuidePath('guides/', 'es'), 'guides/index.es.html');
  assert.equal(
    getLocalizedGuidePath('guides/about.es.html', 'zh-CN'),
    'guides/about.zh-CN.html',
  );
  assert.equal(
    getLocalizedGuidePath('guides/about.es.html', 'en-US'),
    'guides/about.html',
  );
  assert.equal(
    getLocalizedGuidePath('guides/?view=all', 'hi-IN'),
    'guides/index.hi-IN.html?view=all',
  );
  assert.equal(getLocalizedGuidePath('guides/', 'en-US'), 'guides/');
  assert.equal(getLocalizedGuidePath('not-a-guide', 'es'), 'not-a-guide');
  assert.equal(getLocalizedGuidePath(undefined, 'es'), undefined);
});

test('guide links follow the active application locale', () => {
  const links = [
    createLink('guides/'),
    createLink('guides/about.html'),
    createLink('privacy.html'),
  ];
  const document = {
    querySelectorAll: () => links,
  };

  localizeGuideLinks(document, 'es');
  assert.equal(links[0].href, 'guides/index.es.html');
  assert.equal(links[1].href, 'guides/about.es.html');
  assert.equal(links[2].href, 'privacy.html');

  localizeGuideLinks(document, 'ar');
  assert.equal(links[0].href, 'guides/index.ar.html');
  assert.equal(links[1].href, 'guides/about.ar.html');

  localizeGuideLinks(undefined, 'es');
  localizeGuideLinks({}, 'es');
  localizeGuideLinks(
    {
      querySelectorAll: () => [createLink(undefined), createLink('./guides/')],
    },
    'zh-CN',
  );
});

function createLink(href) {
  return {
    href,
    getAttribute: () => href,
    setAttribute(name, value) {
      this[name] = value;
      href = value;
    },
  };
}
