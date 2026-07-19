import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MAX_DIRECTORY_ENTRIES,
  findDirectoryFanoutViolations,
} from '../../scripts/lint/repository-layout.mjs';

test('repository folders stay within manageable fan-out limits', async () => {
  const violations = await findDirectoryFanoutViolations();
  const details = violations
    .map(
      ({ directory, files, folders }) =>
        `${directory}: ${files} files and ${folders} folders`,
    )
    .join('\n');

  assert.deepEqual(
    violations,
    [],
    `Each folder may contain at most ${MAX_DIRECTORY_ENTRIES} files and ` +
      `${MAX_DIRECTORY_ENTRIES} folders.\n${details}`,
  );
});
