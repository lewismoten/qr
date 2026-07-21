import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const QR_PACKAGE = '@lewismoten/qr';

function localHtmlReferences(source) {
  const references = new Set();
  const patterns = [
    /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi,
    /<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi,
    /<link\b[^>]*\b(?:href)=["']([^"']+)["'][^>]*>/gi,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) references.add(match[1]);
  }
  return [...references].filter((reference) => {
    return !/^(?:[a-z]+:|\/\/|#)/i.test(reference);
  });
}

function resolveRouteAsset(siteRoot, htmlFile, reference) {
  const clean = reference.split(/[?#]/)[0];
  if (!clean) return null;
  const route = path.relative(siteRoot, htmlFile);
  const pathname = clean.startsWith('/')
    ? clean.slice(1)
    : path.normalize(path.join(path.dirname(route), clean));
  if (pathname === 'favicon.ico') return 'src/assets/favicon.ico';
  if (pathname.startsWith(`dist${path.sep}`)) return pathname;
  if (pathname.startsWith(`locales${path.sep}`)) {
    return path.join('build', pathname);
  }
  return path.join(siteRoot, pathname);
}

async function existingFiles(files) {
  const results = await Promise.all(
    files.map(async (file) => {
      return stat(file)
        .then(() => file)
        .catch((error) => {
          if (error.code === 'ENOENT') return null;
          throw error;
        });
    }),
  );
  return results.filter(Boolean);
}

export async function measureHtmlRoutes({ siteRoot, findFiles, measureFiles }) {
  const htmlFiles = await findFiles(siteRoot, '.html');
  return Promise.all(
    htmlFiles.map(async (file) => {
      const source = await readFile(file, 'utf8');
      const assets = localHtmlReferences(source)
        .map((reference) => resolveRouteAsset(siteRoot, file, reference))
        .filter(Boolean);
      const availableAssets = await existingFiles(assets);
      return {
        name: path.relative(siteRoot, file),
        ...(await measureFiles([file, ...availableAssets])),
      };
    }),
  );
}

function staticOutputClosure(output, outputs, seen = new Set()) {
  if (seen.has(output) || !outputs[output]) return seen;
  seen.add(output);
  for (const dependency of outputs[output].imports) {
    if (dependency.kind === 'dynamic-import') continue;
    if (!dependency.external) {
      staticOutputClosure(dependency.path, outputs, seen);
    }
    if (dependency.external && dependency.path === QR_PACKAGE) {
      seen.add('dist/qr.min.js');
    }
  }
  return seen;
}

export async function measureJavaScriptEntries(metafile, measureFiles) {
  const entries = Object.entries(metafile.outputs).filter(
    ([file, output]) => output.entryPoint && file.endsWith('.js'),
  );
  return Promise.all(
    entries.map(async ([file, output]) => {
      const files = [...staticOutputClosure(file, metafile.outputs)];
      return {
        name: output.entryPoint,
        file,
        files,
        ...(await measureFiles(files)),
      };
    }),
  );
}

export async function measureAppRoutes({
  routes,
  entries,
  baseFiles,
  measureFiles,
}) {
  const entriesBySource = new Map(entries.map((entry) => [entry.name, entry]));
  return Promise.all(
    Object.entries(routes).map(async ([name, sources]) => {
      const missing = sources.filter((source) => !entriesBySource.has(source));
      if (missing.length) {
        throw new Error(
          `${name} budget references missing entries: ${missing}`,
        );
      }
      const files = new Set(baseFiles);
      sources.forEach((source) => {
        entriesBySource.get(source).files.forEach((file) => files.add(file));
      });
      return {
        name,
        files: [...files],
        ...(await measureFiles([...files])),
      };
    }),
  );
}
