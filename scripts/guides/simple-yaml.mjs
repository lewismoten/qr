import { readFile } from 'node:fs/promises';

export function parseSimpleYaml(source) {
  const root = {};
  const stack = [{ indent: -1, value: root }];
  source.split(/\r?\n/).forEach((line, index) => {
    if (!line.trim() || line.trimStart().startsWith('#')) return;
    const indent = line.length - line.trimStart().length;
    if (indent % 2) {
      throw new Error(
        `YAML indentation must use two spaces on line ${index + 1}.`,
      );
    }
    while (stack.at(-1).indent >= indent) stack.pop();
    const separator = line.trim().indexOf(':');
    if (separator < 1) {
      throw new Error(`Invalid YAML mapping on line ${index + 1}.`);
    }
    const parent = stack.at(-1).value;
    const content = line.trim();
    const key = content.slice(0, separator).trim();
    const text = content.slice(separator + 1).trim();
    const value = text || {};
    parent[key] = value;
    if (!text) stack.push({ indent, value });
  });
  return root;
}

export async function loadSimpleYaml(file) {
  return parseSimpleYaml(await readFile(file, 'utf8'));
}
