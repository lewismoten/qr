import assert from 'node:assert/strict';
import {
  createAbortError,
  isAbortError,
  throwIfAborted,
  waitFor,
} from '../src/js/app/abort.js';

const abortError = createAbortError();
assert.equal(abortError.name, 'AbortError');
assert.equal(abortError.message, 'Operation canceled');
assert.equal(isAbortError(abortError), true);

const controller = new AbortController();
const waiting = waitFor(1000, controller.signal);
controller.abort();
await assert.rejects(waiting, (error) => isAbortError(error));
assert.throws(
  () => throwIfAborted(controller.signal),
  (error) => isAbortError(error),
);

await waitFor(0);
assert.equal(isAbortError(new Error('ordinary failure')), false);
assert.equal(isAbortError(null), false);

const reason = new Error('Specific cancellation reason');
const customController = new AbortController();
const customWaiting = waitFor(1000, customController.signal);
customController.abort(reason);
await assert.rejects(customWaiting, (error) => error === reason);
assert.throws(
  () => throwIfAborted(customController.signal),
  (error) => error === reason,
);

const activeController = new AbortController();
assert.doesNotThrow(() => throwIfAborted(activeController.signal));
assert.doesNotThrow(() => throwIfAborted());

console.log('Abortable export operation tests passed.');
