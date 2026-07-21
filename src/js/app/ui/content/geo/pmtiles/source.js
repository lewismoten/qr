import { decompressPmtiles } from './compression.js';
import { decodeDirectory, findDirectoryEntry } from './directory.js';
import { INITIAL_RANGE_BYTES, parsePmtilesHeader } from './header.js';
import { zxyToTileId } from './tile-id.js';
import { MEDIA_TYPE_PM_TILES } from '../../../../media-types.js';

const HTTP_OK = 200;
const HTTP_PARTIAL_CONTENT = 206;

function createRangeReader(url, fetcher) {
  let etag = null;
  return async (offset, length) => {
    const headers = {
      Accept: MEDIA_TYPE_PM_TILES,
      Range: `bytes=${offset}-${offset + length - 1}`,
    };
    if (etag) headers['If-Match'] = etag;
    const response = await fetcher(url, { headers });
    if (![HTTP_OK, HTTP_PARTIAL_CONTENT].includes(response.status)) {
      throw new Error(`Unable to read PMTiles range: ${response.status}.`);
    }
    const responseLength = Number(response.headers.get('content-length'));
    if (response.status === HTTP_OK && responseLength > length) {
      throw new Error('The PMTiles server does not support byte ranges.');
    }
    etag ||= response.headers.get('etag');
    const bytes = new Uint8Array(await response.arrayBuffer());
    return response.status === HTTP_OK
      ? bytes.subarray(offset, offset + length)
      : bytes;
  };
}

export function createPmtilesSource(url, { fetcher = globalThis.fetch } = {}) {
  const read = createRangeReader(url, fetcher);
  const leaves = new Map();
  let initialized = null;

  async function initialize() {
    if (!initialized) {
      initialized = read(0, INITIAL_RANGE_BYTES).then(async (initial) => {
        const header = parsePmtilesHeader(initial);
        const compressed = initial.subarray(
          header.rootOffset,
          header.rootOffset + header.rootLength,
        );
        const root = decodeDirectory(
          await decompressPmtiles(compressed, header.internalCodec),
        );
        return { header, root };
      });
    }
    return initialized;
  }

  async function leafDirectory(header, entry) {
    const key = `${entry.offset}:${entry.length}`;
    if (!leaves.has(key)) {
      leaves.set(
        key,
        read(header.leafOffset + entry.offset, entry.length).then(
          async (bytes) =>
            decodeDirectory(
              await decompressPmtiles(bytes, header.internalCodec),
            ),
        ),
      );
    }
    return leaves.get(key);
  }

  return {
    async getHeader() {
      return (await initialize()).header;
    },
    async getTile(zoom, x, y) {
      const tileId = zxyToTileId(zoom, x, y);
      const { header, root } = await initialize();
      let entry = findDirectoryEntry(root, tileId);
      if (entry && !entry.runLength) {
        entry = findDirectoryEntry(await leafDirectory(header, entry), tileId);
      }
      if (!entry?.runLength) return null;
      const bytes = await read(header.tileOffset + entry.offset, entry.length);
      return decompressPmtiles(bytes, header.tileCompression);
    },
  };
}
