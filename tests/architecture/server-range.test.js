import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  createEntityTag,
  matchesEntityTag,
  parseByteRange,
} from '../../scripts/server/range.mjs';

test('parses bounded, open, and suffix byte ranges', () => {
  assert.deepEqual(parseByteRange('bytes=10-19', 100), {
    start: 10,
    end: 19,
    length: 10,
  });
  assert.deepEqual(parseByteRange('bytes=90-', 100), {
    start: 90,
    end: 99,
    length: 10,
  });
  assert.deepEqual(parseByteRange('bytes=-8', 100), {
    start: 92,
    end: 99,
    length: 8,
  });
  assert.equal(parseByteRange(undefined, 100), null);
});

test('rejects malformed and unsatisfiable byte ranges', () => {
  assert.equal(parseByteRange('bytes=120-140', 100).unsatisfiable, true);
  assert.equal(parseByteRange('bytes=20-10', 100).unsatisfiable, true);
  assert.equal(parseByteRange('items=0-1', 100).unsatisfiable, true);
  assert.equal(parseByteRange('bytes=-0', 100).unsatisfiable, true);
});

test('creates and matches stable file entity tags', () => {
  const tag = createEntityTag({ size: 4096, mtimeMs: 1234.9 });
  assert.equal(tag, '"1000-4d2"');
  assert.equal(matchesEntityTag(undefined, tag), true);
  assert.equal(matchesEntityTag('*', tag), true);
  assert.equal(matchesEntityTag(`"old", ${tag}`, tag), true);
  assert.equal(matchesEntityTag('"old"', tag), false);
});
