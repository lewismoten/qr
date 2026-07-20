const DEFAULT_INTERVAL_MS = 1500;

function isProgressLine(line) {
  return (
    /^Read [\d.]+(?: thousand| million)? features/i.test(line) ||
    /^\s*\d+(?:\.\d+)?%\s+\d+\/\d+\/\d+/.test(line)
  );
}

export function createProgressOutput(
  writeLine,
  {
    intervalMs = DEFAULT_INTERVAL_MS,
    now = Date.now,
    schedule = setTimeout,
    cancel = clearTimeout,
  } = {},
) {
  let lastWrittenAt = Number.NEGATIVE_INFINITY;
  let pending = null;
  let timer = null;

  const flush = () => {
    timer = null;
    if (!pending) return;
    writeLine(pending);
    pending = null;
    lastWrittenAt = now();
  };

  return {
    writeLine(line) {
      if (!isProgressLine(line)) {
        writeLine(line);
        return;
      }
      pending = line;
      const remaining = intervalMs - (now() - lastWrittenAt);
      if (remaining <= 0) {
        flush();
      } else if (!timer) {
        timer = schedule(flush, remaining);
      }
    },
    finish() {
      if (timer) cancel(timer);
      timer = null;
      flush();
    },
  };
}

export function createLineOutput(writeLine) {
  let pending = '';
  const consume = (line) => {
    const value = line.trim();
    if (value) writeLine(value);
  };
  return {
    write(chunk) {
      const parts = `${pending}${chunk}`.split(/[\r\n]/);
      pending = parts.pop() || '';
      parts.forEach(consume);
    },
    finish() {
      consume(pending);
      pending = '';
    },
  };
}
