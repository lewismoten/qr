import assert from 'node:assert/strict';
import { test } from 'node:test';

import { readNavigationHash } from '../src/js/app/ui/navigation/location.js';

test('navigation hashes accept localized keys and values', () => {
  assert.deepEqual(readNavigationHash('#pestana=contenido&subpestana=datos'), {
    tab: 'content',
    subtab: 'data',
  });
  assert.deepEqual(readNavigationHash('#标签页=样式&子标签页=颜色'), {
    tab: 'style',
    subtab: 'colors',
  });
  assert.deepEqual(readNavigationHash('#pestana=contenido'), {
    tab: 'content',
    subtab: 'data',
  });
  assert.deepEqual(
    readNavigationHash('#pestana=contenido&subpestana=desconocida'),
    { tab: 'content', subtab: 'data' },
  );
  assert.equal(readNavigationHash('#pestana=desconocida'), null);
  assert.deepEqual(readNavigationHash('#تبويب=تنزيل&تبويب-فرعي=مستند'), {
    tab: 'download',
    subtab: 'document',
  });
});
