import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  assertBaseline,
  collectJsonViolations,
  findFiles,
  isCheckedJsonFile,
  root,
} from './object-key-policy.js';

test('JSON object keys remain short lower camel case', async () => {
  const files = (await findFiles(root, new Set(['.json']))).filter(
    isCheckedJsonFile,
  );
  const violations = (
    await Promise.all(
      files.map(async (file) =>
        collectJsonViolations(JSON.parse(await readFile(file, 'utf8'))),
      ),
    )
  ).flat();
  assertBaseline('json', violations);
});
