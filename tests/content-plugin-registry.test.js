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

console.log('Lazy content plugin registry tests passed.');
