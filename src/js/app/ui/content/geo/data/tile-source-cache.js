const DEFAULT_MAXIMUM_BYTES = 16 * 1024 * 1024;
const DEFAULT_MAXIMUM_ENTRIES = 256;

export function createTileSourceCache({
  fetcher = globalThis.fetch,
  createUrl = (blob) => URL.createObjectURL(blob),
  revokeUrl = (url) => URL.revokeObjectURL(url),
  maximumBytes = DEFAULT_MAXIMUM_BYTES,
  maximumEntries = DEFAULT_MAXIMUM_ENTRIES,
} = {}) {
  const entries = new Map();
  let bytes = 0;

  const discard = (key, entry) => {
    entries.delete(key);
    if (!entry.objectUrl) return;
    bytes -= entry.bytes;
    revokeUrl(entry.objectUrl);
  };
  const trim = (protectedKey) => {
    for (const [key, entry] of entries) {
      if (entries.size <= maximumEntries && bytes <= maximumBytes) break;
      if (key === protectedKey || !entry.objectUrl) continue;
      discard(key, entry);
    }
  };
  const resolve = (url) => {
    const existing = entries.get(url);
    if (existing) {
      entries.delete(url);
      entries.set(url, existing);
      return existing.promise;
    }
    if (!fetcher) return Promise.resolve(url);
    const entry = { bytes: 0, objectUrl: null, promise: null };
    entries.set(url, entry);
    entry.promise = fetcher(url)
      .then((response) => {
        if (!response.ok) throw new Error(`Tile request failed: ${url}`);
        return response.blob();
      })
      .then((blob) => {
        entry.bytes = blob.size;
        entry.objectUrl = createUrl(blob);
        bytes += entry.bytes;
        trim(url);
        return entry.objectUrl;
      })
      .catch((error) => {
        discard(url, entry);
        throw error;
      });
    return entry.promise;
  };
  const clear = () => {
    for (const [key, entry] of entries) discard(key, entry);
  };

  return {
    clear,
    resolve,
    get bytes() {
      return bytes;
    },
    get size() {
      return entries.size;
    },
  };
}
