import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  getLocalizedGuidePath,
  localizeNavigationHash,
  localizeGuideLinks,
} from '../src/js/i18n/guide-path.js';

test('guide paths select translated copies and preserve fallbacks', () => {
  assert.equal(
    getLocalizedGuidePath('guides/content/wifi.html', 'es'),
    'es/guias/contenido/wifi.html',
  );
  assert.equal(
    getLocalizedGuidePath('guides/about.html?embed=1', 'ar'),
    'ar/حول.html?embed=1',
  );
  assert.equal(
    getLocalizedGuidePath('zh-CN/二维码规范.html', 'zh-CN'),
    'zh-CN/二维码规范.html',
  );
  assert.equal(
    getLocalizedGuidePath('guides/spec.html', 'en-GB'),
    'en-GB/spec.html',
  );
  assert.equal(getLocalizedGuidePath('guides/', 'es'), 'es/guias/');
  assert.equal(
    getLocalizedGuidePath('es/acerca-de.html', 'zh-CN'),
    'zh-CN/关于.html',
  );
  assert.equal(
    getLocalizedGuidePath('es/acerca-de.html', 'en-US'),
    'about.html',
  );
  assert.equal(
    getLocalizedGuidePath('guides/?view=all', 'hi-IN'),
    'hi-IN/मार्गदर्शिकाएं/?view=all',
  );
  assert.equal(getLocalizedGuidePath('guides/', 'en-US'), 'guides/');
  assert.equal(
    getLocalizedGuidePath('/guides/spec.html', 'es'),
    'es/especificacion-qr.html',
  );
  assert.equal(getLocalizedGuidePath('guides/spec.html'), 'spec.html');
  assert.equal(getLocalizedGuidePath('not-a-guide', 'es'), 'not-a-guide');
  assert.equal(getLocalizedGuidePath(undefined, 'es'), undefined);
});

test('guide navigation hashes use native keys and values', () => {
  assert.equal(
    localizeNavigationHash('#tab=style&amp;subtab=colors', 'es'),
    '#pestana=diseno&subpestana=colores',
  );
  assert.equal(
    localizeNavigationHash('#tab=debug&subtab=mask', 'zh-CN'),
    '#%E6%A0%87%E7%AD%BE%E9%A1%B5=%E8%B0%83%E8%AF%95&%E5%AD%90%E6%A0%87%E7%AD%BE%E9%A1%B5=%E6%8E%A9%E7%A0%81',
  );
  assert.equal(
    localizeNavigationHash('tab=custom&subtab=custom', 'es'),
    'pestana=custom&subpestana=custom',
  );
  assert.equal(
    localizeNavigationHash('#tab=content', 'es'),
    '#pestana=contenido',
  );
  assert.equal(localizeNavigationHash('#about-dialog', 'es'), '#about-dialog');
  assert.equal(localizeNavigationHash('', 'es'), '');
  assert.equal(localizeNavigationHash('#tab=style', 'en-US'), '#tab=style');
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
  assert.equal(links[0].href, 'es/guias/');
  assert.equal(links[1].href, 'es/acerca-de.html');
  assert.equal(links[2].href, 'es/privacidad.html');

  localizeGuideLinks(document, 'ar');
  assert.equal(links[0].href, 'ar/أدلة/');
  assert.equal(links[1].href, 'ar/حول.html');

  localizeGuideLinks(undefined, 'es');
  localizeGuideLinks({}, 'es');
  localizeGuideLinks(
    {
      querySelectorAll: () => [createLink(undefined), createLink('./guides/')],
    },
    'zh-CN',
  );
});

test('guide localization preserves explicit language alternatives', () => {
  const alternate = createLink('guides/privacy.html', {
    hreflang: 'en-GB',
  });

  localizeGuideLinks({ querySelectorAll: () => [alternate] }, 'es');

  assert.equal(alternate.href, 'guides/privacy.html');
});

function createLink(href, attributes = {}) {
  return {
    href,
    getAttribute: (name) => (name === 'href' ? href : attributes[name]),
    setAttribute(name, value) {
      this[name] = value;
      href = value;
    },
  };
}
