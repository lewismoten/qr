const MAGIC = 'PMTiles';
export const HEADER_BYTES = 127;
export const INITIAL_RANGE_BYTES = 16 * 1024;

function uint64(view, offset) {
  const value = view.getBigUint64(offset, true);
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error('PMTiles offset exceeds the browser integer range.');
  }
  return Number(value);
}

export function parsePmtilesHeader(bytes) {
  if (bytes.byteLength < HEADER_BYTES) {
    throw new Error('The PMTiles header is incomplete.');
  }
  const magic = new TextDecoder().decode(bytes.subarray(0, 7));
  if (magic !== MAGIC) throw new Error('The map is not a PMTiles archive.');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint8(7) !== 3) {
    throw new Error('Only PMTiles version 3 is supported.');
  }
  const header = {
    rootOffset: uint64(view, 8),
    rootLength: uint64(view, 16),
    metadataOffset: uint64(view, 24),
    metadataLength: uint64(view, 32),
    leafOffset: uint64(view, 40),
    leafLength: uint64(view, 48),
    tileOffset: uint64(view, 56),
    tileLength: uint64(view, 64),
    addressedTiles: uint64(view, 72),
    tileEntries: uint64(view, 80),
    tileContents: uint64(view, 88),
    clustered: view.getUint8(96) === 1,
    internalCompression: view.getUint8(97),
    tileCompression: view.getUint8(98),
    tileType: view.getUint8(99),
    minimumZoom: view.getUint8(100),
    maximumZoom: view.getUint8(101),
  };
  if (header.tileType !== 1) {
    throw new Error('The PMTiles archive does not contain MVT vector tiles.');
  }
  if (header.rootOffset + header.rootLength > INITIAL_RANGE_BYTES) {
    throw new Error('The PMTiles root directory exceeds the first 16 KiB.');
  }
  return header;
}
