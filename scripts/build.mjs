import { build, context } from 'esbuild';
import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateLocalizedGuides } from './guides/generate-localized-guides.mjs';
import { loadHtmlConfig } from './guides/html-config.mjs';
import { buildLocaleResources } from './locales/resources.mjs';
import { publishDetailedMap } from './maps/vector/publish.mjs';

const watch = process.argv.includes('--watch');
const htmlConfig = await loadHtmlConfig();
const qrPackageName = '@lewismoten/qr';
const qrSource = fileURLToPath(new URL('../src/js/qr-api.js', import.meta.url));
const localQrPlugin = {
  name: 'local-qr-package',
  setup(buildContext) {
    buildContext.onResolve({ filter: /^@lewismoten\/qr$/ }, () => ({
      path: qrSource,
    }));
  },
};
const shared = {
  bundle: true,
  minify: true,
  sourcemap: 'linked',
  sourcesContent: true,
  target: ['es2022'],
  legalComments: 'none',
  logLevel: 'info',
};

const builds = [
  {
    ...shared,
    entryPoints: ['src/js/qr-api.js'],
    outfile: 'dist/qr.min.js',
    format: 'esm',
    platform: 'browser',
  },
  {
    ...shared,
    entryPoints: ['src/js/main.js'],
    outdir: 'dist',
    entryNames: 'app.min',
    chunkNames: 'chunks/[name]-[hash]',
    format: 'esm',
    platform: 'browser',
    splitting: true,
    external: [qrPackageName],
    metafile: true,
  },
  {
    ...shared,
    entryPoints: ['src/js/main.js'],
    outfile: 'dist/app.file.js',
    format: 'iife',
    platform: 'browser',
    plugins: [localQrPlugin],
  },
  {
    ...shared,
    entryPoints: ['src/css/main.css'],
    outfile: 'dist/app.min.css',
  },
  {
    ...shared,
    entryPoints: {
      'chunks/debug-encoding.min': 'src/css/features/debug/encoding.css',
      'chunks/debug-mask.min': 'src/css/features/debug/mask.css',
      'chunks/debug-overlay.min': 'src/css/features/debug/overlay.css',
      'chunks/download.min': 'src/css/features/download/index.css',
      'chunks/geo-map.min': 'src/css/features/content/geo-map.css',
      'chunks/i18n-debug.min': 'src/css/components/i18n-debug.css',
      'chunks/style-artwork.min': 'src/css/features/style/artwork.css',
      'chunks/style-colors.min': 'src/css/features/style/colors.css',
      'chunks/style-modules.min': 'src/css/features/style/modules.css',
      'chunks/task-progress.min': 'src/css/components/task-progress.css',
    },
    outdir: 'dist',
  },
  {
    ...shared,
    entryPoints: ['src/js/spec/spec-entry.js'],
    outfile: 'dist/spec.min.js',
    format: 'esm',
    platform: 'browser',
    external: [qrPackageName],
  },
  {
    ...shared,
    entryPoints: ['src/js/info/info-entry.js'],
    outfile: 'dist/info.min.js',
    format: 'esm',
    platform: 'browser',
  },
  {
    ...shared,
    entryPoints: ['src/js/info/geo-layer-samples.js'],
    outfile: 'dist/geo-samples.min.js',
    format: 'esm',
    platform: 'browser',
  },
  {
    ...shared,
    entryPoints: ['src/css/spec.css'],
    outfile: 'dist/spec.min.css',
  },
];

if (!watch) await rm('dist/chunks', { recursive: true, force: true });

if (watch) {
  await generateLocalizedGuides({ clean: true });
  await buildLocaleResources();
  const contexts = await Promise.all(builds.map((options) => context(options)));
  await Promise.all(contexts.map((buildContext) => buildContext.watch()));
  console.log('Watching JavaScript and CSS sources...');
} else {
  const results = await Promise.all(builds.map((options) => build(options)));
  await mkdir('build/reports', { recursive: true });
  await writeFile(
    'build/reports/app-metafile.json',
    JSON.stringify(results[1].metafile, null, 2),
  );
  await generateLocalizedGuides({ clean: true });
  await buildLocaleResources();
  await mkdir(htmlConfig.outputRoot, { recursive: true });
  await Promise.all([
    cp('dist', path.join(htmlConfig.outputRoot, 'dist'), {
      recursive: true,
    }),
    cp('build/locales', path.join(htmlConfig.outputRoot, 'locales'), {
      recursive: true,
    }),
    cp(
      'src/assets/favicon.ico',
      path.join(htmlConfig.outputRoot, 'favicon.ico'),
    ),
    cp('src/web/robots.txt', path.join(htmlConfig.outputRoot, 'robots.txt')),
  ]);
  await cp('src/assets/maps', path.join(htmlConfig.outputRoot, 'maps'), {
    recursive: true,
  });
  await publishDetailedMap({ outputRoot: htmlConfig.outputRoot });
}
