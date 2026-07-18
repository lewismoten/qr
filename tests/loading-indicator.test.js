import assert from 'node:assert/strict';
import { createLoadingIndicator } from '../src/js/app/ui/loading-indicator.js';

function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

const attributes = new Map();
const indicator = {
  hidden: true,
  setAttribute(name, value) {
    this[name] = value;
  },
};
const region = {
  ownerDocument: {
    createElement: () => indicator,
  },
  classList: { add() {} },
  appendChild(child) {
    this.child = child;
  },
  setAttribute(name, value) {
    attributes.set(name, value);
  },
  removeAttribute(name) {
    attributes.delete(name);
  },
};

const loading = createLoadingIndicator({ region });
assert.equal(await createLoadingIndicator({}).track('ready'), 'ready');
assert.equal(
  createLoadingIndicator({ region }),
  loading,
  'a region should reuse one loading indicator',
);
const first = deferred();
const second = deferred();
const firstRequest = loading.track(first.promise);
const secondRequest = loading.track(second.promise);

assert.equal(indicator.hidden, false);
assert.equal(attributes.get('aria-busy'), 'true');

first.resolve();
await firstRequest;
assert.equal(
  indicator.hidden,
  false,
  'a completed request must not hide another pending request',
);

second.resolve();
await secondRequest;
assert.equal(indicator.hidden, true);
assert.equal(attributes.has('aria-busy'), false);

await assert.rejects(loading.track(Promise.reject(new Error('failed'))));
assert.equal(indicator.hidden, true);
assert.equal(attributes.has('aria-busy'), false);

console.log('Loading indicator tests passed.');
