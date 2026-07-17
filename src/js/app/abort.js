export function createAbortError() {
  const error = new Error('Operation canceled');
  error.name = 'AbortError';
  return error;
}

export function throwIfAborted(signal) {
  if (signal?.aborted) throw signal.reason instanceof Error ? signal.reason : createAbortError();
}

export function isAbortError(error) {
  return error?.name === 'AbortError';
}

export function waitFor(milliseconds, signal) {
  throwIfAborted(signal);
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(done, milliseconds);
    signal?.addEventListener('abort', cancel, { once: true });

    function cleanup() {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', cancel);
    }
    function done() {
      cleanup();
      resolve();
    }
    function cancel() {
      cleanup();
      reject(signal.reason instanceof Error ? signal.reason : createAbortError());
    }
  });
}
