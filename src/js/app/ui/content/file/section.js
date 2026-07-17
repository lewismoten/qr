import { formatBytes } from '../../../bytes.js';

export function createFileSection({
  format,
  mode,
  input,
  capacityHint,
  clearButton,
  chunkControls,
  chunkVersionAuto,
  includeManifest,
  compressTransfer,
  customMetadata,
  chunkIndex,
  cache,
  getDataUrlCapacity,
  getDownloadUrlCapacity,
  getChunkInfo,
  isCompressionEnabled,
  syncChunkVersionControls,
  syncChunkLabel,
  syncNavigation,
  resetCache,
}) {
  const getMode = () => mode.value || 'data';

  const syncMode = () => {
    const isChunked = format.value === 'file' && getMode() === 'chunked';
    chunkControls.hidden = !isChunked;
    chunkControls.setAttribute('aria-hidden', String(!isChunked));

    const { totalChunks, currentChunk } = getChunkInfo();
    chunkVersionAuto.disabled = !isChunked;
    includeManifest.disabled = !isChunked;
    compressTransfer.disabled = !isChunked || !includeManifest.checked;
    customMetadata.disabled = !isChunked || !includeManifest.checked;
    chunkIndex.max = String(Math.max(totalChunks, 1));
    chunkIndex.value = String(Math.min(currentChunk, totalChunks));
    chunkIndex.disabled = !isChunked || totalChunks <= 1;
    syncChunkVersionControls();
    syncChunkLabel();
    syncNavigation();
  };

  const syncCapacity = () => {
    const file = cache.getFile();
    const loadedBytes = file?.size ?? 0;
    const selectedMode = getMode();

    if (selectedMode === 'blob') {
      const maxBytes = getDownloadUrlCapacity(file);
      const percent = maxBytes > 0 ? Math.round((loadedBytes / maxBytes) * 100) : 0;
      capacityHint.textContent = file
        ? `Loaded ${loadedBytes.toLocaleString()} B (${formatBytes(loadedBytes)}) of about ${maxBytes.toLocaleString()} B (${formatBytes(maxBytes)}) max (${percent}%). QR stores a shareable download URL with the file bytes, name, and MIME type.`
        : 'Choose a file to generate a shareable download URL.';
    } else if (selectedMode === 'chunked') {
      const info = getChunkInfo(file);
      const currentFrameBytes = Math.max(
        0,
        Math.min(
          info.chunkCapacity,
          info.streamLength - Math.max(0, info.currentChunk - 1) * Math.max(info.chunkCapacity, 1),
        ),
      );
      const limitText = info.autoVersion
        ? `auto-selected uniform V${info.configuredChunkVersion}`
        : `uniform V${info.configuredChunkVersion}`;
      capacityHint.textContent = file
        ? `Loaded ${loadedBytes.toLocaleString()} B (${formatBytes(loadedBytes)}); ${isCompressionEnabled() ? `gzip transfer is ${info.transferByteLength.toLocaleString()} B (${formatBytes(info.transferByteLength)})` : 'transfer compression is off'}, plus a ${info.manifestLength.toLocaleString()} B manifest. Frame ${info.currentChunk} of ${info.totalChunks} carries ${currentFrameBytes.toLocaleString()} B with ${limitText}; full frames use ${info.chunkCapacity.toLocaleString()} B (${formatBytes(info.chunkCapacity)}) of stream capacity.`
        : 'Choose a file to split it into chunked QR payloads.';
    } else {
      const maxBytes = getDataUrlCapacity();
      const percent = maxBytes > 0 ? Math.round((loadedBytes / maxBytes) * 100) : 0;
      capacityHint.textContent = file
        ? `Loaded ${loadedBytes.toLocaleString()} B (${formatBytes(loadedBytes)}) of ${maxBytes.toLocaleString()} B (${formatBytes(maxBytes)}) max (${percent}%).`
        : 'Choose a file to embed it directly as a data URL.';
    }

    clearButton.disabled = !input.files?.length && !cache.getPayload();
    syncMode();
  };

  const clear = () => {
    resetCache({ clearInput: true });
    chunkIndex.value = '1';
    syncCapacity();
  };

  return { getMode, syncMode, syncCapacity, clear };
}
