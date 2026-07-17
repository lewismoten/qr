import { build, context } from 'esbuild';
import { rm } from 'node:fs/promises';

const watch = process.argv.includes('--watch');
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
    entryPoints: ['src/js/main.js'],
    outdir: 'dist',
    entryNames: 'app.min',
    chunkNames: 'chunks/[name]-[hash]',
    format: 'esm',
    platform: 'browser',
    splitting: true,
  },
  {
    ...shared,
    entryPoints: ['src/js/main.js'],
    outfile: 'dist/app.file.js',
    format: 'iife',
    platform: 'browser',
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
    entryPoints: ['src/js/spec/main.js'],
    outfile: 'dist/spec.min.js',
    format: 'esm',
    platform: 'browser',
  },
  {
    ...shared,
    entryPoints: ['src/js/info/main.js'],
    outfile: 'dist/info.min.js',
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
  const contexts = await Promise.all(builds.map((options) => context(options)));
  await Promise.all(contexts.map((buildContext) => buildContext.watch()));
  console.log('Watching JavaScript and CSS sources...');
} else {
  await Promise.all(builds.map((options) => build(options)));
}
