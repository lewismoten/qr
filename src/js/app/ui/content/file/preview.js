import {
  encodeStreamPosition,
  getCompactFileExtension,
  getFileManifestFlag,
} from './protocol.js';
import { lookup } from '../../../../i18n/index.js';

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
      return lookup('content.preview.file', '[Selected file content]');
    }
    if (mode !== 'chunked') {
      const selected = lookup(
        'content.preview.file',
        '[Selected file content]',
      );
      return `${selected} ${file.name}`;
    }
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
