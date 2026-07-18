import assert from 'node:assert/strict';
import test from 'node:test';

import {
  collectGuideText,
  translateGuideHtml,
} from '../scripts/guide-translations.mjs';

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
