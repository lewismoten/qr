import { formatBytes } from '../../../bytes.js';
import { lookup } from '../../../../i18n/index.js';

const PERCENT_SCALE = 100;

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
      const percent =
        maxBytes > 0 ? Math.round((loadedBytes / maxBytes) * PERCENT_SCALE) : 0;
      capacityHint.textContent = file
        ? lookup(
            'file.capacity.download',
            'Loaded {loadedBytes} B ({loadedSize}) of about {maxBytes} B ({maxSize}) max ({percent}%). QR stores a shareable download URL with the file bytes, name, and MIME type.',
            {
              loadedBytes: loadedBytes.toLocaleString(),
              loadedSize: formatBytes(loadedBytes),
              maxBytes: maxBytes.toLocaleString(),
              maxSize: formatBytes(maxBytes),
              percent,
            },
          )
        : lookup(
            'file.capacity.chooseDownload',
            'Choose a file to generate a shareable download URL.',
          );
    } else if (selectedMode === 'chunked') {
      const info = getChunkInfo(file);
      const currentFrameBytes = Math.max(
        0,
        Math.min(
          info.chunkCapacity,
          info.streamLength -
            Math.max(0, info.currentChunk - 1) *
              Math.max(info.chunkCapacity, 1),
        ),
      );
      const limitText = info.autoVersion
        ? lookup(
            'file.capacity.autoVersion',
            'auto-selected uniform V{version}',
            { version: info.targetVersion },
          )
        : lookup('file.capacity.version', 'uniform V{version}', {
            version: info.targetVersion,
          });
      const transfer = isCompressionEnabled()
        ? lookup('file.capacity.gzip', 'gzip transfer is {bytes} B ({size})', {
            bytes: info.transferSize.toLocaleString(),
            size: formatBytes(info.transferSize),
          })
        : lookup('file.capacity.noCompression', 'transfer compression is off');
      capacityHint.textContent = file
        ? lookup(
            'file.capacity.chunked',
            'Loaded {loadedBytes} B ({loadedSize}); {transfer}, plus a {manifestBytes} B manifest. Frame {current} of {total} carries {frameBytes} B with {limit}; full frames use {capacityBytes} B ({capacitySize}) of stream capacity.',
            {
              loadedBytes: loadedBytes.toLocaleString(),
              loadedSize: formatBytes(loadedBytes),
              transfer,
              manifestBytes: info.manifestLength.toLocaleString(),
              current: info.currentChunk,
              total: info.totalChunks,
              frameBytes: currentFrameBytes.toLocaleString(),
              limit: limitText,
              capacityBytes: info.chunkCapacity.toLocaleString(),
              capacitySize: formatBytes(info.chunkCapacity),
            },
          )
        : lookup(
            'file.capacity.chooseChunked',
            'Choose a file to split it into chunked QR payloads.',
          );
    } else {
      const maxBytes = getDataUrlCapacity();
      const percent =
        maxBytes > 0 ? Math.round((loadedBytes / maxBytes) * PERCENT_SCALE) : 0;
      capacityHint.textContent = file
        ? lookup(
            'file.capacity.data',
            'Loaded {loadedBytes} B ({loadedSize}) of {maxBytes} B ({maxSize}) max ({percent}%).',
            {
              loadedBytes: loadedBytes.toLocaleString(),
              loadedSize: formatBytes(loadedBytes),
              maxBytes: maxBytes.toLocaleString(),
              maxSize: formatBytes(maxBytes),
              percent,
            },
          )
        : lookup(
            'file.capacity.chooseData',
            'Choose a file to embed it directly as a data URL.',
          );
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
