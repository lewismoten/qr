import { build, context } from 'esbuild';

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
    outfile: 'dist/app.min.js',
    format: 'iife',
    platform: 'browser',
  },
  {
    ...shared,
    entryPoints: ['src/css/main.css'],
    outfile: 'dist/app.min.css',
  },
];

if (watch) {
  const contexts = await Promise.all(builds.map((options) => context(options)));
  await Promise.all(contexts.map((buildContext) => buildContext.watch()));
  console.log('Watching JavaScript and CSS sources...');
} else {
  await Promise.all(builds.map((options) => build(options)));
}
