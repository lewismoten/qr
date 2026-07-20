import assert from 'node:assert/strict';
import test from 'node:test';

import { HANDBOOK_ROUTES } from '../../src/js/info/handbook/pages.js';
import {
  getGuideOutputPath,
  GUIDE_ROUTES,
} from '../../src/js/i18n/guide-routes.js';

test('handbook includes every helpful route exactly once', () => {
  assert.equal(new Set(HANDBOOK_ROUTES).size, HANDBOOK_ROUTES.length);
  assert.equal(HANDBOOK_ROUTES.includes('index'), false);
  for (const route of GUIDE_ROUTES) {
    if (route !== 'index') assert.ok(HANDBOOK_ROUTES.includes(route), route);
  }
  assert.equal(HANDBOOK_ROUTES[0], 'about');
  assert.equal(HANDBOOK_ROUTES.at(-2), 'spec');
  assert.equal(HANDBOOK_ROUTES.at(-1), 'privacy');
});

test('handbook routes resolve to native localized paths', () => {
  assert.equal(getGuideOutputPath('technology', 'es'), 'es/tecnologia.html');
  assert.equal(
    getGuideOutputPath('content/email', 'zh-CN'),
    'zh-CN/指南/内容/电子邮件.html',
  );
});
