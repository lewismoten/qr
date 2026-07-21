import {
  base64ToBase64Url,
  buildChunkFileFrameTemplate,
  buildSingleFileFrameTemplate,
  getFileDataUrlPrefix,
  getFileDownloadUrlPrefix,
} from './transfer/protocol.js';

const DEFAULT_INITIAL_PROBE_BYTES = 256;
const BYTES_PER_KIBIBYTE = 1024;
const BYTES_PER_MEBIBYTE = BYTES_PER_KIBIBYTE ** 2;
const BASE64_SOURCE_BYTES = 3;
const BASE64_ENCODED_CHARACTERS = 4;

export function findMaximumEncodableBytes(
  canEncode,
  {
    initialProbe = DEFAULT_INITIAL_PROBE_BYTES,
    maximumProbe = BYTES_PER_MEBIBYTE,
  } = {},
) {
  if (!canEncode(0)) return 0;

  let low = 0;
  let high = initialProbe;
  while (high <= maximumProbe && canEncode(high)) {
    low = high;
    high *= 2;
  }

  while (low + 1 < high) {
    const middle = Math.floor((low + high) / 2);
    if (canEncode(middle)) low = middle;
    else high = middle;
  }
  return low;
}

export function createFileCapacityCalculator({
  encoder,
  cache,
  getOptions,
  buildPayload,
  getConfiguredVersion,
  isAutoVersion,
  getCurrentChunk,
  includeManifest,
  isCompressionEnabled,
  getCustomMetadata,
  getManualMode,
  getManifestLength,
  getShareableAppUrl,
}) {
  let cachedKey = '';
  let cachedValue = null;
  const invalidate = () => {
    cachedKey = '';
    cachedValue = null;
  };

  const getEncodingOptions = () => {
    try {
      return getOptions();
    } catch {
      return null;
    }
  };

  const canEncode = (payload, options) => {
    try {
      encoder.create(buildPayload(payload), options);
      return true;
    } catch {
      return false;
    }
  };

  const getDataUrlCapacity = () => {
    const options = getEncodingOptions();
    if (!options) return 0;
    const prefix = getFileDataUrlPrefix(cache.getFile());
    return findMaximumEncodableBytes((byteCount) => {
      const base64Length =
        Math.ceil(byteCount / BASE64_SOURCE_BYTES) * BASE64_ENCODED_CHARACTERS;
      return canEncode(`${prefix}${'A'.repeat(base64Length)}`, options);
    });
  };

  const getDownloadUrlCapacity = (file = cache.getFile()) => {
    const options = getEncodingOptions();
    if (!options) return 0;
    const prefix = getFileDownloadUrlPrefix(getShareableAppUrl(), file);
    return findMaximumEncodableBytes((byteCount) => {
      const base64Length =
        Math.ceil(byteCount / BASE64_SOURCE_BYTES) * BASE64_ENCODED_CHARACTERS;
      return canEncode(
        `${prefix}${base64ToBase64Url('A'.repeat(base64Length))}`,
        options,
      );
    });
  };

  const getEmptyChunkInfo = () => ({
    chunkCapacity: 0,
    naturalChunkCapacity: 0,
    configuredChunkVersion: getConfiguredVersion(),
    autoVersion: isAutoVersion(),
    totalChunks: 1,
    currentChunk: 1,
  });

  const getChunkInfo = (file = cache.getFile()) => {
    if (!file) return getEmptyChunkInfo();
    const options = getEncodingOptions();
    if (!options) return getEmptyChunkInfo();

    const configuredChunkVersion = getConfiguredVersion();
    const autoVersion = isAutoVersion();
    const capacityOptions = { ...options, version: configuredChunkVersion };
    const cacheKey = JSON.stringify({
      file: {
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified,
      },
      options: capacityOptions,
      configuredChunkVersion,
      autoVersion,
      includeManifest: includeManifest(),
      compressTransfer: isCompressionEnabled(),
      customMetadata: getCustomMetadata(),
      transferBytes: cache.getCachedTransferBytes()?.length ?? null,
      manualMode: getManualMode() || 'auto',
    });
    if (cachedKey === cacheKey && cachedValue) {
      return {
        ...cachedValue,
        currentChunk: Math.min(getCurrentChunk(), cachedValue.totalChunks),
      };
    }

    const transferByteLength =
      cache.getCachedTransferBytes()?.length ?? file.size;
    const manifestLength = getManifestLength(file);
    const streamLength = transferByteLength + manifestLength;
    const isSingleFrame = canEncode(
      buildSingleFileFrameTemplate(streamLength, {
        file,
        includeManifest: includeManifest(),
      }),
      capacityOptions,
    );
    const chunkCapacity = isSingleFrame
      ? streamLength
      : findMaximumEncodableBytes((byteCount) =>
          canEncode(
            buildChunkFileFrameTemplate(byteCount, {
              file,
              streamLength,
              offset: Math.max(0, streamLength - 1),
              includeManifest: includeManifest(),
            }),
            capacityOptions,
          ),
        );
    const totalChunks = isSingleFrame
      ? 1
      : Math.max(1, Math.ceil(streamLength / Math.max(chunkCapacity, 1)));
    const capacityInfo = {
      chunkCapacity,
      naturalChunkCapacity: chunkCapacity,
      configuredChunkVersion,
      autoVersion,
      streamLength,
      manifestLength,
      transferByteLength,
      isSingleFrame,
      totalChunks,
      currentChunk: Math.min(getCurrentChunk(), totalChunks),
    };
    cachedKey = cacheKey;
    cachedValue = capacityInfo;
    return capacityInfo;
  };

  return {
    invalidate,
    getDataUrlCapacity,
    getDownloadUrlCapacity,
    getChunkInfo,
  };
}
