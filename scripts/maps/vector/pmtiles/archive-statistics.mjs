import { gunzipSync } from 'node:zlib';

const HEADER_BYTES = 127;

function uint64(view, offset) {
  return Number(view.getBigUint64(offset, true));
}

function readVarint(bytes, state) {
  let value = 0;
  let multiplier = 1;
  while (state.offset < bytes.length) {
    const byte = bytes[state.offset++];
    value += (byte & 0x7f) * multiplier;
    if (!(byte & 0x80)) return value;
    multiplier *= 128;
  }
  throw new Error('Invalid PMTiles directory varint.');
}

function decodeDirectory(bytes) {
  const state = { offset: 0 };
  const count = readVarint(bytes, state);
  const entries = Array.from({ length: count }, () => ({}));
  for (let index = 0; index < count; index += 1) readVarint(bytes, state);
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

async function readRange(handle, offset, length) {
  const bytes = Buffer.alloc(length);
  const { bytesRead } = await handle.read(bytes, 0, length, offset);
  if (bytesRead !== length) throw new Error('PMTiles directory is incomplete.');
  return bytes;
}

function decompress(bytes, compression) {
  if (compression === 1) return bytes;
  if (compression === 2) return gunzipSync(bytes);
  throw new Error(`Unsupported PMTiles compression: ${compression}.`);
}

function summarize(entries, maximumTileBytes, summary) {
  for (const entry of entries) {
    if (!entry.runLength) continue;
    summary.actualLargestTileBytes = Math.max(
      summary.actualLargestTileBytes,
      entry.length,
    );
    if (entry.length > maximumTileBytes) {
      summary.actualTileContentsOverLimit += 1;
    }
  }
}

export async function scanArchiveTileStatistics(
  handle,
  maximumTileBytes = Number.MAX_SAFE_INTEGER,
) {
  const header = await readRange(handle, 0, HEADER_BYTES);
  const view = new DataView(
    header.buffer,
    header.byteOffset,
    header.byteLength,
  );
  const rootOffset = uint64(view, 8);
  const rootLength = uint64(view, 16);
  const leafOffset = uint64(view, 40);
  const compression = view.getUint8(97);
  const root = decodeDirectory(
    decompress(await readRange(handle, rootOffset, rootLength), compression),
  );
  const summary = {
    actualLargestTileBytes: 0,
    actualTileContentsOverLimit: 0,
  };
  summarize(root, maximumTileBytes, summary);
  const leaves = root.filter((entry) => !entry.runLength);
  for (const leaf of leaves) {
    const entries = decodeDirectory(
      decompress(
        await readRange(handle, leafOffset + leaf.offset, leaf.length),
        compression,
      ),
    );
    summarize(entries, maximumTileBytes, summary);
  }
  return summary;
}
