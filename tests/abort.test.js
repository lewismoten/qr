import assert from 'node:assert/strict';
import { isAbortError, throwIfAborted, waitFor } from '../src/js/app/abort.js';

const controller = new AbortController();
const waiting = waitFor(1000, controller.signal);
controller.abort();
await assert.rejects(waiting, (error) => isAbortError(error));
assert.throws(() => throwIfAborted(controller.signal), (error) => isAbortError(error));

await waitFor(0);
assert.equal(isAbortError(new Error('ordinary failure')), false);

console.log('Abortable export operation tests passed.');
