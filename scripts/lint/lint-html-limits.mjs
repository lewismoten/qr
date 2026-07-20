import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const MAX_HTML_LINES = 300;

export const LEGACY_HTML_LIMITS = new Map([
  ['src/html/guides/content/geo.html', 718],
  ['src/html/guides/style/artwork.html', 712],
  ['src/html/guides/style/colors.html', 402],
  ['src/html/guides/style/modules.html', 400],
  ['src/html/index.html', 1886],
  ['src/html/spec.html', 887],
  ['src/html/technology.html', 821],
]);

function countLines(source) {
  if (!source) return 0;
  const count = source.split(/\r?\n/).length;
  return source.endsWith('\n') ? count - 1 : count;
}

async function htmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) return htmlFiles(target);
      return entry.name.endsWith('.html') ? [target] : [];
    }),
  );
  return files.flat();
}

export async function findHtmlLineViolations({
  root = '.',
  sourceRoot = 'src/html',
  legacyLimits = LEGACY_HTML_LIMITS,
} = {}) {
  const sourceDirectory = path.resolve(root, sourceRoot);
  const files = await htmlFiles(sourceDirectory);
  const violations = [];
  for (const file of files) {
    const relative = path.relative(root, file);
    const lines = countLines(await readFile(file, 'utf8'));
    const legacyLimit = legacyLimits.get(relative);
    const limit = legacyLimit ?? MAX_HTML_LINES;
    if (lines > limit) {
      violations.push({ file: relative, lines, limit });
    }
  }
  return violations.sort((left, right) => left.file.localeCompare(right.file));
}

async function main() {
  const violations = await findHtmlLineViolations();
  if (violations.length) {
    for (const item of violations) {
      console.error(
        `${item.file}: ${item.lines} lines; limit is ${item.limit}`,
      );
    }
    process.exitCode = 1;
    return;
  }
  console.log(
    `HTML limits passed; new files are capped at ${MAX_HTML_LINES} lines.`,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await main();
