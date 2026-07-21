const QR_PACKAGE = '@lewismoten/qr';

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
      return { name, ...(await measureFiles([...files])) };
    }),
  );
}
