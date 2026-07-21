import assert from 'node:assert/strict';
import test from 'node:test';

import {
  collectJavascriptViolations,
  collectJsonViolations,
} from './object-key-policy.js';

const invalidObjectJson =
  '{"validCamelKey":true,"PascalCase":true,' +
  '"needs-quote":true,"abcdefghijklmnopq":true}';

test('object-key policy identifies every prohibited key shape', () => {
  const expectedJson = [
    'json|lowerCamelCase|PascalCase',
    'json|identifierSafe|needs-quote',
    'json|length|abcdefghijklmnopq',
  ];
  assert.deepEqual(
    collectJsonViolations(JSON.parse(invalidObjectJson)),
    expectedJson,
  );
  assert.deepEqual(
    collectJavascriptViolations(`const value = ${invalidObjectJson};`),
    expectedJson.map((value) => value.replace('json|', 'javascript|')),
  );
});
