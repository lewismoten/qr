import { readFile, readdir } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';

const MAX_FILE_LINES = 300;
const MAX_LINE_LENGTH = 80;
const root = process.cwd();
const ignoredDirectories = new Set(['.git', 'dist', 'node_modules']);

async function findCssFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nestedFiles = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        return ignoredDirectories.has(entry.name) ? [] : findCssFiles(path);
      }
      return extname(entry.name) === '.css' ? [path] : [];
    }),
  );
  return nestedFiles.flat();
}

const files = await findCssFiles(root);
const failures = [];

for (const file of files) {
  const source = await readFile(file, 'utf8');
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  if (lines.at(-1) === '') lines.pop();
  const name = relative(root, file);

  if (lines.length > MAX_FILE_LINES) {
    failures.push(`${name}: ${lines.length} lines exceeds ${MAX_FILE_LINES}`);
  }
  lines.forEach((line, index) => {
    if (line.length > MAX_LINE_LENGTH) {
      failures.push(
        `${name}:${index + 1}: ${line.length} characters exceeds ` +
          MAX_LINE_LENGTH,
      );
    }
  });
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(
    `CSS limits passed for ${files.length} files ` +
      `(${MAX_FILE_LINES} lines, ${MAX_LINE_LENGTH} characters).`,
  );
}
