import { readdir } from 'node:fs/promises';
import path from 'node:path';

export const MAX_DIRECTORY_ENTRIES = 10;

const IGNORED_DIRECTORIES = new Set([
  '.cache',
  '.git',
  'benchmark-results',
  'build',
  'coverage',
  'dist',
  'node_modules',
]);

export async function findDirectoryFanoutViolations(root = '.') {
  const violations = [];

  async function visit(directory) {
    const entries = (await readdir(directory, { withFileTypes: true })).filter(
      (entry) => !(entry.isDirectory() && IGNORED_DIRECTORIES.has(entry.name)),
    );
    const files = entries.filter((entry) => !entry.isDirectory());
    const folders = entries.filter((entry) => entry.isDirectory());
    if (
      files.length > MAX_DIRECTORY_ENTRIES ||
      folders.length > MAX_DIRECTORY_ENTRIES
    ) {
      violations.push({
        directory: path.relative(root, directory) || '.',
        files: files.length,
        folders: folders.length,
      });
    }
    await Promise.all(
      folders.map((entry) => visit(path.join(directory, entry.name))),
    );
  }

  await visit(root);
  return violations.sort((left, right) =>
    left.directory.localeCompare(right.directory),
  );
}
