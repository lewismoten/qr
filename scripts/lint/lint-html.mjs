import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

import htmlhint from 'htmlhint';

import { readHtmlWithIncludes } from '../html/includes.mjs';

async function entryFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      if (entry.name === 'parts') return [];
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) return entryFiles(target);
      return entry.name.endsWith('.html') ? [target] : [];
    }),
  );
  return nested.flat();
}

const configFile = process.argv[2] || 'config/htmlhint.json';
const sourceRoot = process.argv[3] || 'src/html';
const rules = JSON.parse(await readFile(configFile, 'utf8'));
const files = await entryFiles(sourceRoot);
let errors = 0;
for (const file of files) {
  const source = await readHtmlWithIncludes(file, { root: sourceRoot });
  const messages = htmlhint.HTMLHint.verify(source, rules);
  for (const message of messages) {
    errors += 1;
    console.error(
      `${file}:${message.line}:${message.col} ${message.rule.id}: ` +
        message.message,
    );
  }
}
if (errors) process.exitCode = 1;
else console.log(`HTMLHint passed for ${files.length} composed pages.`);
