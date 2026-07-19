import assert from 'node:assert/strict';
import { access, readdir } from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';

import {
  configuredGuidePath,
  configuredGuideSource,
  loadHtmlConfig,
} from '../../scripts/guides/html-config.mjs';
import {
  GUIDE_LOCALES,
  GUIDE_ROUTES,
  getGuideOutputPath,
} from '../../src/js/i18n/guide-routes.js';

async function findHtml(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (['.git', 'build', 'node_modules'].includes(entry.name)) return [];
        return findHtml(file);
      }
      return file.endsWith('.html') ? [file] : [];
    }),
  );
  return files.flat();
}

test('HTML sources and native deployment routes follow site.yaml', async () => {
  const config = await loadHtmlConfig();
  assert.equal(config.server.root, 'src/html');
  assert.equal(config.deployment.html.from, 'src/html');
  assert.equal(config.deployment.assets.from, 'dist');
  assert.deepEqual(Object.keys(config.guides), GUIDE_ROUTES);

  for (const route of GUIDE_ROUTES) {
    await access(configuredGuideSource(config, route));
    for (const locale of GUIDE_LOCALES) {
      assert.equal(
        configuredGuidePath(config, route, locale),
        getGuideOutputPath(route, locale),
      );
    }
  }

  const html = await findHtml('.');
  assert.ok(html.every((file) => file.startsWith('src/html/')));
});
