export function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}

export function base64ToBase64Url(base64) {
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function base64UrlToBase64(base64Url) {
  const normalized = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const paddingLength = (4 - (normalized.length % 4 || 4)) % 4;
  return `${normalized}${'='.repeat(paddingLength)}`;
}

export function createCompactFileId() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return base64ToBase64Url(arrayBufferToBase64(bytes.buffer));
}

export function getFileDataUrlPrefix(file) {
  return `data:${file?.type?.trim() || 'application/octet-stream'};base64,`;
}

export function getCompactFileExtension(value) {
  const sanitized = String(value || '').toUpperCase().replace(/[^A-Z0-9.]/g, '');
  const segments = sanitized.split('.');
  const extension = segments.length > 1 ? segments.pop() : '';
  return (extension || 'BIN').slice(0, 8);
}

export function getBase64UrlLength(byteCount) {
  return Math.ceil((Math.max(0, byteCount) * 4) / 3);
}

export function encodeStreamPosition(value, streamLength) {
  const width = Math.max(1, Math.max(0, streamLength).toString(10).length);
  return Math.max(0, value).toString(10).padStart(width, '0');
}
