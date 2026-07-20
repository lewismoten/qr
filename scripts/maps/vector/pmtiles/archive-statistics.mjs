import { gunzipSync } from 'node:zlib';

const HEADER_BYTES = 127;
const VARINT_VALUE_MASK = 0x7f;
const VARINT_CONTINUATION_BIT = 0x80;
const VARINT_RADIX = 128;
const HEADER_OFFSETS = {
  root: 8,
  rootLength: 16,
  leaf: 40,
  compression: 97,
};

function uint64(view, offset) {
  return Number(view.getBigUint64(offset, true));
}

function readVarint(bytes, state) {
  let value = 0;
  let multiplier = 1;
  while (state.offset < bytes.length) {
    const byte = bytes[state.offset++];
    value += (byte & VARINT_VALUE_MASK) * multiplier;
    if (!(byte & VARINT_CONTINUATION_BIT)) return value;
    multiplier *= VARINT_RADIX;
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
  const rootOffset = uint64(view, HEADER_OFFSETS.root);
  const rootLength = uint64(view, HEADER_OFFSETS.rootLength);
  const leafOffset = uint64(view, HEADER_OFFSETS.leaf);
  const compression = view.getUint8(HEADER_OFFSETS.compression);
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
