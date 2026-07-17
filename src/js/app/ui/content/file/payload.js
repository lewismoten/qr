import {
  arrayBufferToBase64,
  base64ToBase64Url,
  buildChunkFileFrame,
  buildSingleFileFrame,
  getFileDataUrlPrefix,
  getFileDownloadUrlPrefix,
} from './protocol.js';
import { lookup } from '../../../../i18n/index.js';

function assembleChunk(manifestBytes, transferBytes, start, end) {
  const chunkBytes = new Uint8Array(end - start);
  const manifestStart = Math.min(start, manifestBytes.length);
  const manifestEnd = Math.min(end, manifestBytes.length);
  if (manifestEnd > manifestStart) {
    chunkBytes.set(manifestBytes.subarray(manifestStart, manifestEnd), 0);
  }

  const fileStart = Math.max(0, start - manifestBytes.length);
  const fileEnd = Math.max(0, end - manifestBytes.length);
  if (fileEnd > fileStart) {
    chunkBytes.set(transferBytes.subarray(fileStart, fileEnd), Math.max(0, manifestBytes.length - start));
  }
  return chunkBytes;
}

export function createFilePayloadBuilder({
  cache,
  getMode,
  getShareableAppUrl,
  includeManifest,
  chunkIndex,
  getManifest,
  getCapacityInfo,
  syncCapacity,
}) {
  const buildDataUrl = async () => {
    const file = cache.getFile();
    if (!file) {
      cache.reset();
      return '';
    }
    cache.ensureOwnership(file);
    if (cache.getPayload()) return cache.getPayload();
    const payload = `${getFileDataUrlPrefix(file)}${await cache.getBase64()}`;
    cache.setPayload(payload);
    return payload;
  };

  const buildDownloadUrl = async (file) => {
    cache.ensureOwnership(file);
    return `${getFileDownloadUrlPrefix(getShareableAppUrl(), file)}${base64ToBase64Url(await cache.getBase64())}`;
  };

  const buildChunked = async (file) => {
    cache.ensureOwnership(file);
    const requestRevision = cache.getRevision();
    const transferBytes = await cache.getTransferBytes();
    if (!cache.isCurrent(requestRevision)) throw new DOMException('Transfer settings changed.', 'AbortError');
    const manifestBytes = await getManifest(transferBytes);
    if (!cache.isCurrent(requestRevision)) throw new DOMException('Transfer settings changed.', 'AbortError');

    syncCapacity();
    const { chunkCapacity, totalChunks, streamLength, isSingleFrame } = getCapacityInfo(file);
    if (chunkCapacity <= 0) {
      throw new Error(lookup('file.chunkFitError', 'Unable to fit the current chunk protocol into this QR configuration.'));
    }

    const currentChunk = Math.min(Number.parseInt(chunkIndex.value, 10) || 1, totalChunks);
    const start = (currentChunk - 1) * chunkCapacity;
    const end = Math.min(start + chunkCapacity, streamLength);
    const data = base64ToBase64Url(arrayBufferToBase64(assembleChunk(manifestBytes, transferBytes, start, end).buffer));
    if (isSingleFrame) {
      return buildSingleFileFrame({ data, file, includeManifest: includeManifest() });
    }
    return buildChunkFileFrame({
      data,
      file,
      id: cache.getId(),
      offset: start,
      streamLength,
      includeManifest: includeManifest(),
    });
  };

  const build = async () => {
    const file = cache.getFile();
    if (!file) return '';
    switch (getMode()) {
      case 'blob': return buildDownloadUrl(file);
      case 'chunked': return buildChunked(file);
      case 'data':
      default: return buildDataUrl();
    }
  };

  return { build };
}
