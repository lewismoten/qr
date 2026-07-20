const MAGIC = 'PMTiles';
const MAGIC_BYTES = 7;
const VERSION_OFFSET = 7;
const SUPPORTED_VERSION = 3;
const MVT_TILE_TYPE = 1;
const KIBIBYTE = 1024;
const INITIAL_RANGE_KIB = 16;
const HEADER_OFFSETS = {
  root: 8,
  rootLength: 16,
  metadata: 24,
  metadataLength: 32,
  leaf: 40,
  leafLength: 48,
  tile: 56,
  tileLength: 64,
  addressedTiles: 72,
  tileEntries: 80,
  tileContents: 88,
  clustered: 96,
  internalCompression: 97,
  tileCompression: 98,
  tileType: 99,
  minimumZoom: 100,
  maximumZoom: 101,
};
export const HEADER_BYTES = 127;
export const INITIAL_RANGE_BYTES = INITIAL_RANGE_KIB * KIBIBYTE;

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
  const magic = new TextDecoder().decode(bytes.subarray(0, MAGIC_BYTES));
  if (magic !== MAGIC) throw new Error('The map is not a PMTiles archive.');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint8(VERSION_OFFSET) !== SUPPORTED_VERSION) {
    throw new Error('Only PMTiles version 3 is supported.');
  }
  const header = {
    rootOffset: uint64(view, HEADER_OFFSETS.root),
    rootLength: uint64(view, HEADER_OFFSETS.rootLength),
    metadataOffset: uint64(view, HEADER_OFFSETS.metadata),
    metadataLength: uint64(view, HEADER_OFFSETS.metadataLength),
    leafOffset: uint64(view, HEADER_OFFSETS.leaf),
    leafLength: uint64(view, HEADER_OFFSETS.leafLength),
    tileOffset: uint64(view, HEADER_OFFSETS.tile),
    tileLength: uint64(view, HEADER_OFFSETS.tileLength),
    addressedTiles: uint64(view, HEADER_OFFSETS.addressedTiles),
    tileEntries: uint64(view, HEADER_OFFSETS.tileEntries),
    tileContents: uint64(view, HEADER_OFFSETS.tileContents),
    clustered: view.getUint8(HEADER_OFFSETS.clustered) === 1,
    internalCompression: view.getUint8(HEADER_OFFSETS.internalCompression),
    tileCompression: view.getUint8(HEADER_OFFSETS.tileCompression),
    tileType: view.getUint8(HEADER_OFFSETS.tileType),
    minimumZoom: view.getUint8(HEADER_OFFSETS.minimumZoom),
    maximumZoom: view.getUint8(HEADER_OFFSETS.maximumZoom),
  };
  if (header.tileType !== MVT_TILE_TYPE) {
    throw new Error('The PMTiles archive does not contain MVT vector tiles.');
  }
  if (header.rootOffset + header.rootLength > INITIAL_RANGE_BYTES) {
    throw new Error('The PMTiles root directory exceeds the first 16 KiB.');
  }
  return header;
}
