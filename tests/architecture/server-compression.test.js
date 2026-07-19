import assert from 'node:assert/strict';
import { Readable, Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { test } from 'node:test';
import { brotliDecompressSync, gunzipSync } from 'node:zlib';

import {
  createContentEncoder,
  selectContentEncoding,
  shouldCompress,
} from '../../scripts/server/compression.mjs';

async function encode(value, encoding) {
  const chunks = [];
  const destination = new Writable({
    write(chunk, _encoding, callback) {
      chunks.push(chunk);
      callback();
    },
  });
  await pipeline(
    Readable.from(value),
    createContentEncoder(encoding),
    destination,
  );
  return Buffer.concat(chunks);
}

test('negotiates Brotli and gzip quality preferences', () => {
  assert.equal(selectContentEncoding('gzip, br'), 'br');
  assert.equal(selectContentEncoding('br;q=.4, gzip;q=.8'), 'gzip');
  assert.equal(selectContentEncoding('br;q=0, *;q=.5'), 'gzip');
  assert.equal(selectContentEncoding('identity'), null);
  assert.equal(selectContentEncoding(), null);
});

test('compresses text formats but skips small and compressed assets', () => {
  assert.equal(shouldCompress('image/svg+xml', 1000), true);
  assert.equal(shouldCompress('application/json; charset=utf-8', 300), true);
  assert.equal(shouldCompress('image/png', 1000), false);
  assert.equal(shouldCompress('text/html', 100), false);
});

test('creates working Brotli and gzip streams', async () => {
  const content = Buffer.from('<svg>'.repeat(100));
  assert.deepEqual(brotliDecompressSync(await encode(content, 'br')), content);
  assert.deepEqual(gunzipSync(await encode(content, 'gzip')), content);
  assert.equal(createContentEncoder(null), null);
});
