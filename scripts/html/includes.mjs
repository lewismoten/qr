import { readFile } from 'node:fs/promises';
import path from 'node:path';

const INCLUDE_PATTERN = /<!--\s*include\s+file=(['"])(.+?)\1\s*-->/;

function assertInsideRoot(file, root) {
  const relative = path.relative(root, file);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`HTML include escapes its source root: ${file}`);
  }
}

export async function readHtmlWithIncludes(
  file,
  { root = 'src/html', stack = [] } = {},
) {
  const sourceRoot = path.resolve(root);
  const current = path.resolve(file);
  assertInsideRoot(current, sourceRoot);
  if (stack.includes(current)) {
    const cycle = [...stack, current]
      .map((entry) => path.basename(entry))
      .join(' -> ');
    throw new Error(`Circular HTML include: ${cycle}`);
  }
  let source = await readFile(current, 'utf8');
  const ancestry = [...stack, current];
  let match = INCLUDE_PATTERN.exec(source);
  while (match) {
    const included = path.resolve(path.dirname(current), match[2]);
    assertInsideRoot(included, sourceRoot);
    const content = await readHtmlWithIncludes(included, {
      root: sourceRoot,
      stack: ancestry,
    });
    source =
      source.slice(0, match.index) +
      content +
      source.slice(match.index + match[0].length);
    match = INCLUDE_PATTERN.exec(source);
  }
  return source;
}
