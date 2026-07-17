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
];

if (!watch) await rm('dist/chunks', { recursive: true, force: true });

if (watch) {
  const contexts = await Promise.all(builds.map((options) => context(options)));
  await Promise.all(contexts.map((buildContext) => buildContext.watch()));
  console.log('Watching JavaScript and CSS sources...');
} else {
  await Promise.all(builds.map((options) => build(options)));
}
