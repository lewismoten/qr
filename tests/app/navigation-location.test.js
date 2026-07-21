import assert from 'node:assert/strict';
import { test } from 'node:test';

import { readNavigationHash } from '../../src/js/app/ui/navigation/location.js';
import { NAVIGATION_ALIASES } from '../../src/js/i18n/guide-routes.js';

const aliases = Object.values(NAVIGATION_ALIASES);

test('navigation hashes accept localized keys and values', () => {
  assert.deepEqual(
    readNavigationHash('#pestana=contenido&subpestana=datos', aliases),
    {
      tab: 'content',
      subtab: 'data',
    },
  );
  assert.deepEqual(readNavigationHash('#标签页=样式&子标签页=颜色', aliases), {
    tab: 'style',
    subtab: 'colors',
  });
  assert.deepEqual(readNavigationHash('#pestana=contenido', aliases), {
    tab: 'content',
    subtab: 'data',
  });
  assert.deepEqual(
    readNavigationHash('#pestana=contenido&subpestana=desconocida', aliases),
    { tab: 'content', subtab: 'data' },
  );
  assert.equal(readNavigationHash('#pestana=desconocida', aliases), null);
  assert.deepEqual(
    readNavigationHash('#تبويب=تنزيل&تبويب-فرعي=مستند', aliases),
    {
      tab: 'download',
      subtab: 'document',
    },
  );
});
