export function parseByteRange(value, size) {
  if (!value) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(value.trim());
  if (!match || (!match[1] && !match[2])) return { unsatisfiable: true };
  let start;
  let end;
  if (!match[1]) {
    const suffix = Number(match[2]);
    if (!suffix) return { unsatisfiable: true };
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Number(match[2]) : size - 1;
  }
  if (start >= size || start > end) return { unsatisfiable: true };
  end = Math.min(end, size - 1);
  return { start, end, length: end - start + 1 };
}

export function createEntityTag(fileStat) {
  const modified = Math.trunc(fileStat.mtimeMs).toString(16);
  return `"${fileStat.size.toString(16)}-${modified}"`;
}

export function matchesEntityTag(value, entityTag) {
  if (!value) return true;
  return value
    .split(',')
    .map((item) => item.trim())
    .some((item) => item === '*' || item === entityTag);
}
