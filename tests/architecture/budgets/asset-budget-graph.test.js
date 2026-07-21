import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  measureAppRoutes,
  measureJavaScriptEntries,
} from '../../../scripts/lint/asset-budget-graph.mjs';

const APP_BYTES = 10;
const SHARED_BYTES = 20;
const LAZY_BYTES = 30;
const PAGE_BYTES = 40;
const APP_ENTRY_BYTES = APP_BYTES + SHARED_BYTES;
const LAZY_ENTRY_BYTES = LAZY_BYTES + SHARED_BYTES;
const ROUTE_BYTES = APP_BYTES + SHARED_BYTES + LAZY_BYTES + PAGE_BYTES;
const sizes = new Map([
  ['dist/app.js', APP_BYTES],
  ['dist/chunks/shared.js', SHARED_BYTES],
  ['dist/chunks/lazy.js', LAZY_BYTES],
  ['page.html', PAGE_BYTES],
]);
const measureFiles = async (files) => {
  const bytes = files.reduce((total, file) => total + sizes.get(file), 0);
  return { raw: bytes, transfer: bytes };
};
const metafile = {
  outputs: {
    'dist/app.js': {
      entryPoint: 'src/main.js',
      imports: [
        { path: 'dist/chunks/shared.js', kind: 'import-statement' },
        { path: 'dist/chunks/lazy.js', kind: 'dynamic-import' },
      ],
    },
    'dist/chunks/shared.js': { imports: [] },
    'dist/chunks/lazy.js': {
      entryPoint: 'src/lazy.js',
      imports: [{ path: 'dist/chunks/shared.js', kind: 'import-statement' }],
    },
  },
};

test('asset graph measures static entry closures without dynamic imports', async () => {
  const entries = await measureJavaScriptEntries(metafile, measureFiles);
  assert.deepEqual(
    entries.map(({ name, raw }) => [name, raw]),
    [
      ['src/main.js', APP_ENTRY_BYTES],
      ['src/lazy.js', LAZY_ENTRY_BYTES],
    ],
  );
});

test('route budgets deduplicate chunks shared by multiple entries', async () => {
  const entries = await measureJavaScriptEntries(metafile, measureFiles);
  const routes = await measureAppRoutes({
    routes: { example: ['src/main.js', 'src/lazy.js'] },
    entries,
    baseFiles: ['page.html'],
    measureFiles,
  });
  assert.equal(routes[0].transfer, ROUTE_BYTES);
});

test('every application tab and subtab has a configured route budget', async () => {
  const html = await readFile('src/html/index.html', 'utf8');
  const config = JSON.parse(
    await readFile('config/asset-budgets.json', 'utf8'),
  );
  const families = [
    ['content', 'content-subtab'],
    ['style', 'style-subtab'],
    ['download', 'download-subtab'],
    ['debug', 'subtab'],
  ];
  const expected = families.flatMap(([tab, attribute]) => {
    const pattern = new RegExp(`data-${attribute}="([^"]+)"`, 'g');
    return [...html.matchAll(pattern)].map((match) => `${tab}/${match[1]}`);
  });
  const missing = expected.filter((route) => !config.appRoutes[route]);
  assert.deepEqual(missing, []);
});

test('cold-start budget includes independently requested assets', async () => {
  const config = JSON.parse(
    await readFile('config/asset-budgets.json', 'utf8'),
  );
  assert.deepEqual(config.startupFiles, [
    'build/site/index.html',
    'dist/app.min.css',
    'src/assets/favicon.ico',
    'build/locales/manifest.json',
    'build/locales/en-US.json',
  ]);
  assert.deepEqual(config.appRoutes['content/data'], [
    'src/js/main.js',
    'src/js/app/app-controller.js',
  ]);
});

test('translated guide routing stays out of static startup imports', async () => {
  const startupModules = [
    'src/js/i18n/index.js',
    'src/js/app/ui/fragment-loader.js',
    'src/js/app/ui/navigation/location.js',
  ];
  for (const file of startupModules) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(source, /^import .*guide-(?:path|routes)/m, file);
  }
  const i18n = await readFile('src/js/i18n/index.js', 'utf8');
  const navigation = await readFile(
    'src/js/app/ui/navigation/location.js',
    'utf8',
  );
  assert.match(i18n, /import\('\.\/guide-path\.js'\)/);
  assert.match(navigation, /import\([\s\S]*guide-routes\.js/);
});

test('route budgets reject missing entry points', async () => {
  await assert.rejects(
    () =>
      measureAppRoutes({
        routes: { example: ['src/missing.js'] },
        entries: [],
        baseFiles: [],
        measureFiles,
      }),
    /missing entries: src\/missing\.js/,
  );
});
