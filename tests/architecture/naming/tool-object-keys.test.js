import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  assertBaseline,
  collectJavascriptViolations,
  root,
  scanJavascriptRoots,
} from './object-key-policy.js';

test('tooling object keys remain short lower camel case', async () => {
  const violations = await scanJavascriptRoots([
    'benchmarks',
    'scripts',
    'tests',
  ]);
  violations.push(
    ...collectJavascriptViolations(
      await readFile(`${root}/eslint.config.js`, 'utf8'),
    ),
  );
  assertBaseline('tooling', violations);
});
