const BASE64_CHUNK_BYTES = 0x8000;
const BASE64_GROUP_BYTES = 3;
const BASE64_GROUP_CHARACTERS = 4;
const BASE64_ALIGNMENT = 4;
const FILE_ID_BYTES = 16;
const MAXIMUM_EXTENSION_CHARACTERS = 8;
const DECIMAL_RADIX = 10;

export function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let index = 0; index < bytes.length; index += BASE64_CHUNK_BYTES) {
    binary += String.fromCharCode(
      ...bytes.subarray(index, index + BASE64_CHUNK_BYTES),
    );
  }
  return btoa(binary);
}

export function base64ToBase64Url(base64) {
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function base64UrlToBase64(base64Url) {
  const normalized = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const remainder = normalized.length % BASE64_ALIGNMENT;
  const paddingLength =
    (BASE64_ALIGNMENT - (remainder || BASE64_ALIGNMENT)) % BASE64_ALIGNMENT;
  return `${normalized}${'='.repeat(paddingLength)}`;
}

export function createCompactFileId() {
  const bytes = new Uint8Array(FILE_ID_BYTES);
  crypto.getRandomValues(bytes);
  return base64ToBase64Url(arrayBufferToBase64(bytes.buffer));
}

export function getFileDataUrlPrefix(file) {
  return `data:${file?.type?.trim() || 'application/octet-stream'};base64,`;
}

export function getCompactFileExtension(value) {
  const sanitized = String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9.]/g, '');
  const segments = sanitized.split('.');
  const extension = segments.length > 1 ? segments.pop() : '';
  return (extension || 'BIN').slice(0, MAXIMUM_EXTENSION_CHARACTERS);
}

export function getBase64UrlLength(byteCount) {
  return Math.ceil(
    (Math.max(0, byteCount) * BASE64_GROUP_CHARACTERS) / BASE64_GROUP_BYTES,
  );
}

export function encodeStreamPosition(value, streamLength) {
  const width = Math.max(
    1,
    Math.max(0, streamLength).toString(DECIMAL_RADIX).length,
  );
  return Math.max(0, value).toString(DECIMAL_RADIX).padStart(width, '0');
}

export function getFileManifestFlag(includeManifest) {
  return includeManifest ? 'M' : '-';
}

export function getFileDownloadUrlPrefix(appUrl, file) {
  const name = file?.name || 'file.bin';
  const type = file?.type?.trim() || 'application/octet-stream';
  return `${appUrl}#download=1&name=${encodeURIComponent(name)}&type=${encodeURIComponent(type)}&data=`;
}

export function buildSingleFileFrame({
  data,
  file,
  includeManifest,
  prefix = 'FILE',
  version = '1',
}) {
  const parts = [prefix, version, 'S', getFileManifestFlag(includeManifest)];
  if (!includeManifest) parts.push(getCompactFileExtension(file?.name));
  parts.push(data);
  return parts.join(':');
}

export function buildChunkFileFrame({
  data,
  file,
  id,
  offset,
  streamLength,
  includeManifest,
  prefix = 'FILE',
  version = '1',
}) {
  return [
    prefix,
    version,
    'C',
    getFileManifestFlag(includeManifest),
    id,
    getCompactFileExtension(file?.name),
    encodeStreamPosition(offset, streamLength),
    Math.max(0, streamLength).toString(DECIMAL_RADIX),
    data,
  ].join(':');
}

export function buildSingleFileFrameTemplate(
  byteCount,
  { file, includeManifest } = {},
) {
  return buildSingleFileFrame({
    data: 'a'.repeat(getBase64UrlLength(byteCount)),
    file: file ?? { name: 'file.bin' },
    includeManifest,
  });
}

export function buildChunkFileFrameTemplate(
  byteCount,
  { file, streamLength = 0, offset = 0, includeManifest } = {},
) {
  return buildChunkFileFrame({
    data: 'a'.repeat(getBase64UrlLength(byteCount)),
    file: file ?? { name: 'file.bin' },
    id: 'aaaaaaaaaaaaaaaaaaaaaa',
    offset,
    streamLength,
    includeManifest,
  });
}
