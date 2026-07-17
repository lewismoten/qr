import { formatBytes } from '../../../bytes.js';
import { isAbortError, throwIfAborted, waitFor } from '../../../abort.js';
import { lookup } from '../../../../i18n/index.js';

export { isAbortError, throwIfAborted };

export async function readCsvText(file, task) {
  if (!file.stream) {
    const text = await file.text();
    throwIfAborted(task.signal);
    task.update(0.55, lookup('bulk.progress.parsing', 'Parsing CSV data...'));
    return text;
  }

  const reader = file.stream().getReader();
  const decoder = new TextDecoder();
  let loaded = 0;
  let text = '';
  try {
    while (true) {
      throwIfAborted(task.signal);
      const { done, value } = await reader.read();
      if (done) break;
      loaded += value.byteLength;
      text += decoder.decode(value, { stream: true });
      task.update(
        (loaded / Math.max(file.size, 1)) * 0.55,
        lookup(
          'bulk.progress.readingBytes',
          'Reading {current} of {total}...',
          {
            current: formatBytes(loaded),
            total: formatBytes(file.size),
          },
        ),
      );
      await waitFor(0, task.signal);
    }
    text += decoder.decode();
    return text;
  } finally {
    if (task.signal.aborted) await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
