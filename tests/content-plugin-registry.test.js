import assert from 'node:assert/strict';
import { createContentPluginRegistry } from '../src/js/app/ui/content/plugin-registry.js';

const format = { value: 'url' };
let textLoads = 0;
const registry = createContentPluginRegistry({
  format,
  initial: {
    url: {
      build: () => 'https://example.test',
      preview: () => 'https://example.test',
    },
  },
  loaders: {
    text: async () => {
      textLoads += 1;
      return {
        build: () => 'loaded text',
        preview: () => 'loaded text preview',
      };
    },
  },
});

assert.equal(await registry.build(), 'https://example.test');
assert.equal(registry.preview(), 'https://example.test');
assert.equal(textLoads, 0);

format.value = 'text';
assert.match(registry.preview(), /preview loads/i);
assert.equal(textLoads, 0);
assert.equal(await registry.build(), 'loaded text');
assert.equal(textLoads, 1);
assert.equal(registry.preview(), 'loaded text preview');
await registry.ensure('text');
assert.equal(textLoads, 1);
assert.equal(await registry.ensure('unknown'), null);
assert.equal(registry.get('unknown'), null);

let failures = 0;
const failing = createContentPluginRegistry({
  format: { value: 'broken' },
  initial: {},
  loaders: {
    broken: async () => {
      failures += 1;
      throw new Error('Plugin failed');
    },
  },
});
await assert.rejects(failing.build(), /Plugin failed/);
await assert.rejects(failing.ensure(), /Plugin failed/);
assert.equal(failures, 2, 'a failed plugin request should be retryable');

const empty = createContentPluginRegistry({
  format: { value: 'empty' },
  initial: { empty: {} },
  loaders: {},
});
assert.equal(await empty.build(), '');
assert.match(empty.preview(), /preview loads/i);

console.log('Lazy content plugin registry tests passed.');
