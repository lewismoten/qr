function readVarint(bytes, state) {
  let value = 0;
  let multiplier = 1;
  while (state.offset < bytes.length) {
    const byte = bytes[state.offset++];
    value += (byte & 0x7f) * multiplier;
    if (!(byte & 0x80)) return value;
    multiplier *= 128;
    if (multiplier > Number.MAX_SAFE_INTEGER) break;
  }
  throw new Error('Invalid PMTiles directory varint.');
}

export function decodeDirectory(bytes) {
  const state = { offset: 0 };
  const count = readVarint(bytes, state);
  if (!count) throw new Error('A PMTiles directory cannot be empty.');
  if (count > 1_000_000 || count * 4 > bytes.length) {
    throw new Error('The PMTiles directory entry count is invalid.');
  }
  const entries = Array.from({ length: count }, () => ({}));
  let tileId = 0;
  for (const entry of entries) {
    tileId += readVarint(bytes, state);
    entry.tileId = tileId;
  }
  for (const entry of entries) entry.runLength = readVarint(bytes, state);
  for (const entry of entries) entry.length = readVarint(bytes, state);
  for (let index = 0; index < entries.length; index += 1) {
    const encoded = readVarint(bytes, state);
    const previous = entries[index - 1];
    entries[index].offset =
      encoded === 0 && previous
        ? previous.offset + previous.length
        : encoded - 1;
  }
  return entries;
}

export function findDirectoryEntry(entries, tileId) {
  let low = 0;
  let high = entries.length - 1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (entries[middle].tileId <= tileId) low = middle + 1;
    else high = middle - 1;
  }
  if (high < 0) return null;
  const entry = entries[high];
  const next = entries[high + 1];
  if (!entry.runLength) {
    return !next || tileId < next.tileId ? entry : null;
  }
  return tileId < entry.tileId + entry.runLength ? entry : null;
}
