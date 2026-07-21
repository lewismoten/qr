import { readFile } from 'node:fs/promises';

import {
  assertBaseline,
  collectJavascriptViolations,
  collectJsonViolations,
  findFiles,
  isCheckedJsonFile,
  root,
  scanJavascriptRoots,
} from './object-key-policy.js';

async function scanJson() {
  const files = (await findFiles(root, new Set(['.json']))).filter(
    isCheckedJsonFile,
  );
  return (
    await Promise.all(
      files.map(async (file) =>
        collectJsonViolations(JSON.parse(await readFile(file, 'utf8'))),
      ),
    )
  ).flat();
}

async function scanTooling() {
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
  return violations;
}

export async function enforceObjectKeys() {
  const [app, json, tooling] = await Promise.all([
    scanJavascriptRoots(['src/js']),
    scanJson(),
    scanTooling(),
  ]);
  assertBaseline('app', app);
  assertBaseline('json', json);
  assertBaseline('tooling', tooling);
}
