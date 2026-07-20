import path from 'node:path';

const ROOT_NAMESPACE = 'locale';

function sourceNamespace(directory, sourceRoot) {
  const relative = path.relative(sourceRoot, directory);
  return relative ? relative.split(path.sep).join('-') : ROOT_NAMESPACE;
}

export function localeSourceFilename(directory, locale, sourceRoot) {
  return `${sourceNamespace(directory, sourceRoot)}-${locale}.json`;
}

export function localeSourcePath(directory, locale, sourceRoot) {
  return path.join(
    directory,
    localeSourceFilename(directory, locale, sourceRoot),
  );
}

export function localeFromSourceFilename(filename, locales) {
  return locales.find((locale) => filename.endsWith(`-${locale}.json`));
}
