import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const MAX_MARKDOWN_LINES = 300;

const IGNORED_DIRECTORIES = new Set([
  '.cache',
  '.git',
  'benchmark-results',
  'build',
  'coverage',
  'dist',
  'node_modules',
]);

function countLines(source) {
  if (!source) return 0;
  const lines = source.split(/\r?\n/).length;
  return source.endsWith('\n') ? lines - 1 : lines;
}

export async function findMarkdownViolations(root = '.') {
  const violations = [];

  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!IGNORED_DIRECTORIES.has(entry.name)) {
          await visit(path.join(directory, entry.name));
        }
        continue;
      }
      if (!entry.name.toLowerCase().endsWith('.md')) continue;
      const file = path.join(directory, entry.name);
      const relative = path.relative(root, file);
      const lines = countLines(await readFile(file, 'utf8'));
      if (relative !== 'README.md' && !relative.startsWith(`docs${path.sep}`)) {
        violations.push({ file: relative, reason: 'outside docs', lines });
      }
      if (lines > MAX_MARKDOWN_LINES) {
        violations.push({ file: relative, reason: 'too long', lines });
      }
    }
  }

  await visit(root);
  return violations.sort((left, right) => {
    return (
      left.file.localeCompare(right.file) ||
      left.reason.localeCompare(right.reason)
    );
  });
}

async function main() {
  const violations = await findMarkdownViolations();
  if (violations.length) {
    for (const item of violations) {
      console.error(`${item.file}: ${item.reason} (${item.lines} lines)`);
    }
    process.exitCode = 1;
    return;
  }
  console.log(`Markdown layout passed (${MAX_MARKDOWN_LINES} lines maximum).`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await main();
