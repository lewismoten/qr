import {
  encodeStreamPosition,
  getCompactFileExtension,
  getFileManifestFlag,
} from './protocol.js';

export function createFilePayloadPreview({
  getFile,
  getMode,
  getCapacity,
  includeManifest,
}) {
  return () => {
    const file = getFile();
    const mode = getMode();
    if (!file) {
      if (mode === 'chunked') return 'FILE:1:S:M:[base64url-data]';
      return mode === 'blob'
        ? '[shareable download URL]'
        : '[data URL for a selected file]';
    }
    if (mode === 'blob') return `[shareable download URL for ${file.name}]`;
    if (mode !== 'chunked') return `[data URL for ${file.name}]`;
    const { chunkCapacity, currentChunk, streamLength, isSingleFrame } =
      getCapacity(file);
    if (isSingleFrame) {
      return includeManifest.checked
        ? 'FILE:1:S:M:[base64url-data]'
        : `FILE:1:S:-:${getCompactFileExtension(file.name)}:[base64url-data]`;
    }
    const offset = Math.max(0, currentChunk - 1) * chunkCapacity;
    const flag = getFileManifestFlag(includeManifest.checked);
    const extension = getCompactFileExtension(file.name);
    const position = encodeStreamPosition(offset, streamLength);
    return `FILE:1:C:${flag}:[base64url-id]:${extension}:${position}:${streamLength}:[base64url-data]`;
  };
}
