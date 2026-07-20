import assert from 'node:assert/strict';
import test from 'node:test';

import { createProgressOutput } from '../../../scripts/maps/reporting/progress-output.mjs';

test('throttles repetitive map progress while preserving other messages', () => {
  const lines = [];
  const timers = [];
  let time = 0;
  const output = createProgressOutput((line) => lines.push(line), {
    intervalMs: 1500,
    now: () => time,
    schedule(callback) {
      timers.push(callback);
      return timers.length;
    },
    cancel() {},
  });

  output.writeLine('Read 1.2 million features');
  time = 100;
  output.writeLine('Read 2.4 million features');
  output.writeLine('43.9% 5/8/12');
  output.writeLine('Reordering geometry: 98%');
  output.writeLine('Merging index');
  output.writeLine('Merging string pool');
  output.writeLine('A useful warning');

  assert.deepEqual(lines, ['Read 1.2 million features', 'A useful warning']);
  time = 1500;
  timers[0]();
  assert.deepEqual(lines, [
    'Read 1.2 million features',
    'A useful warning',
    'Merging string pool',
  ]);
  output.finish();
});
