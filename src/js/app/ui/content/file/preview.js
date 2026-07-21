import {
  encodeStreamPosition,
  FILE_CHUNK_FRAME_KIND,
  FILE_MANIFEST_FLAG,
  FILE_NO_MANIFEST_FLAG,
  FILE_PROTOCOL_PREFIX,
  FILE_PROTOCOL_VERSION,
  FILE_SINGLE_FRAME_KIND,
  getCompactFileExtension,
  getFileManifestFlag,
} from './transfer/protocol.js';
import { lookup } from '../../../../i18n/index.js';

const BASE64URL_DATA_PLACEHOLDER = '[base64url-data]';
const BASE64URL_ID_PLACEHOLDER = '[base64url-id]';

function buildSingleFramePreview(manifestFlag, extension) {
  return [
    FILE_PROTOCOL_PREFIX,
    FILE_PROTOCOL_VERSION,
    FILE_SINGLE_FRAME_KIND,
    manifestFlag,
    extension,
    BASE64URL_DATA_PLACEHOLDER,
  ]
    .filter((part) => part !== '')
    .join(':');
}

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
      if (mode === 'chunked') {
        return buildSingleFramePreview(FILE_MANIFEST_FLAG, '');
      }
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
      return buildSingleFramePreview(
        includeManifest.checked ? FILE_MANIFEST_FLAG : FILE_NO_MANIFEST_FLAG,
        includeManifest.checked ? '' : getCompactFileExtension(file.name),
      );
    }
    const offset = Math.max(0, currentChunk - 1) * chunkCapacity;
    const flag = getFileManifestFlag(includeManifest.checked);
    const extension = getCompactFileExtension(file.name);
    const position = encodeStreamPosition(offset, streamLength);
    return [
      FILE_PROTOCOL_PREFIX,
      FILE_PROTOCOL_VERSION,
      FILE_CHUNK_FRAME_KIND,
      flag,
      BASE64URL_ID_PLACEHOLDER,
      extension,
      position,
      streamLength,
      BASE64URL_DATA_PLACEHOLDER,
    ].join(':');
  };
}
