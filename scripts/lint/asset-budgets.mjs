import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync, constants } from 'node:zlib';
import {
  measureAppRoutes,
  measureHtmlRoutes,
  measureJavaScriptEntries,
} from './asset-budget-graph.mjs';
import { printAssetBudgetReport } from './asset-budget-output.mjs';

const KIBIBYTE = 1024;
const MEBIBYTE = KIBIBYTE * KIBIBYTE;
const BROTLI_QUALITY = 4;
const COMPRESSIBLE_EXTENSIONS = new Set([
  '.css',
  '.html',
  '.js',
  '.json',
  '.svg',
  '.xml',
]);

async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

async function findFiles(directory, extension) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) return findFiles(file, extension);
      return entry.isFile() && file.endsWith(extension) ? [file] : [];
    }),
  );
  return nested.flat();
}

function isCompressible(file) {
  return COMPRESSIBLE_EXTENSIONS.has(path.extname(file));
}

function createFileMeasurer() {
  const cache = new Map();
  return async (file) => {
    if (!cache.has(file)) {
      cache.set(
        file,
        readFile(file).then((content) => ({
          raw: content.length,
          transfer: isCompressible(file)
            ? brotliCompressSync(content, {
                params: {
                  [constants.BROTLI_PARAM_QUALITY]: BROTLI_QUALITY,
                },
              }).length
            : content.length,
        })),
      );
    }
    return cache.get(file);
  };
}

async function measureFiles(files, measureFile) {
  const unique = [...new Set(files)];
  const sizes = await Promise.all(unique.map(measureFile));
  return sizes.reduce(
    (total, size) => ({
      raw: total.raw + size.raw,
      transfer: total.transfer + size.transfer,
    }),
    { raw: 0, transfer: 0 },
  );
}

function addCheck(checks, category, name, bytes, limit) {
  checks.push({ category, name, bytes, limit, passed: bytes <= limit });
}

async function addMapChecks(checks, config) {
  const manifestFile = 'build/maps/local.json';
  const manifest = await readJson(manifestFile).catch(() => null);
  if (!manifest) return { available: false, targetMisses: [] };
  const manifestBytes = (await stat(manifestFile)).size;
  addCheck(
    checks,
    'map manifest',
    manifestFile,
    manifestBytes,
    config.limits.mapManifestRawKiB * KIBIBYTE,
  );
  for (const archive of manifest.archives) {
    addCheck(
      checks,
      'map archive',
      archive.file,
      archive.bytes,
      config.limits.mapArchiveMiB * MEBIBYTE,
    );
    const tileBytes = archive.archiveStats?.actualLargestTileBytes || 0;
    addCheck(
      checks,
      'map tile',
      archive.file,
      tileBytes,
      config.limits.mapTileKiB * KIBIBYTE,
    );
  }
  addCheck(
    checks,
    'map total',
    manifestFile,
    manifest.totalBytes,
    config.limits.mapTotalMiB * MEBIBYTE,
  );
  return {
    available: true,
    targetMisses: [{ name: manifestFile, bytes: manifestBytes }],
  };
}

export async function evaluateAssetBudgets({
  configFile = 'config/asset-budgets.json',
  siteRoot = 'build/site',
  metafile = 'build/reports/app-metafile.json',
} = {}) {
  const config = await readJson(configFile);
  const measureFile = createFileMeasurer();
  const measureOutputFiles = (files) => measureFiles(files, measureFile);
  const checks = [];
  const routes = await measureHtmlRoutes({
    siteRoot,
    findFiles,
    measureFiles: measureOutputFiles,
  });
  for (const route of routes) {
    if (route.name === 'index.html') continue;
    addCheck(
      checks,
      'HTML route raw',
      route.name,
      route.raw,
      config.limits.htmlRouteRawKiB * KIBIBYTE,
    );
    addCheck(
      checks,
      'HTML route transfer',
      route.name,
      route.transfer,
      config.limits.htmlRouteTransferKiB * KIBIBYTE,
    );
  }

  const metadata = await readJson(metafile);
  const entries = await measureJavaScriptEntries(metadata, measureOutputFiles);
  for (const entry of entries) {
    const initial = entry.file === 'dist/app.min.js';
    addCheck(
      checks,
      initial ? 'initial JavaScript' : 'lazy JavaScript entry',
      entry.name,
      initial ? entry.raw : entry.transfer,
      (initial
        ? config.limits.initialJavaScriptRawKiB
        : config.limits.lazyJavaScriptEntryTransferKiB) * KIBIBYTE,
    );
  }

  const appRoutes = await measureAppRoutes({
    routes: config.appRoutes,
    entries,
    baseFiles: config.startupFiles,
    measureFiles: measureOutputFiles,
  });
  for (const route of appRoutes) {
    addCheck(
      checks,
      'application route raw',
      route.name,
      route.raw,
      config.limits.appRouteRawKiB * KIBIBYTE,
    );
    addCheck(
      checks,
      'application route transfer',
      route.name,
      route.transfer,
      config.limits.appRouteTransferKiB * KIBIBYTE,
    );
  }
  const startup = appRoutes.find(({ name }) => name === 'content/data');
  addCheck(
    checks,
    'initial route raw',
    'index.html cold startup',
    startup.raw,
    config.limits.initialRouteRawKiB * KIBIBYTE,
  );
  addCheck(
    checks,
    'initial route transfer',
    'index.html cold startup',
    startup.transfer,
    config.limits.initialRouteTransferKiB * KIBIBYTE,
  );

  const chunks = await findFiles('dist/chunks', '.js');
  for (const file of chunks) {
    const { raw } = await measureFile(file);
    addCheck(
      checks,
      'lazy JavaScript chunk',
      file,
      raw,
      config.limits.lazyJavaScriptChunkRawKiB * KIBIBYTE,
    );
  }
  for (const file of await findFiles('dist', '.css')) {
    const { raw } = await measureFile(file);
    const initial = !file.includes(`${path.sep}chunks${path.sep}`);
    addCheck(
      checks,
      initial ? 'initial CSS' : 'lazy CSS',
      file,
      raw,
      (initial ? config.limits.initialCssRawKiB : config.limits.lazyCssRawKiB) *
        KIBIBYTE,
    );
  }
  const maps = await addMapChecks(checks, config);
  const target = config.targetRawKiB * KIBIBYTE;
  const targetMisses = [
    ...routes.map(({ name, raw }) => ({ name, bytes: raw })),
    ...entries.map(({ name, raw }) => ({ name, bytes: raw })),
    ...appRoutes.map(({ name, raw }) => ({ name, bytes: raw })),
    ...maps.targetMisses,
  ].filter(({ bytes }) => bytes > target);
  return {
    checks,
    target,
    targetMisses,
    startup,
    mapsAvailable: maps.available,
  };
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
  const report = await evaluateAssetBudgets();
  if (printAssetBudgetReport(report).length) process.exitCode = 1;
}
