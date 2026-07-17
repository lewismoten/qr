import { lookup } from '../../../../i18n/index.js';
import { refreshFilePicker } from '../../file-picker.js';

export function createFileCache({ input, createId, encodeBase64, isCompressionEnabled }) {
  let owner = null;
  let payload = '';
  let arrayBuffer = null;
  let base64 = '';
  let id = '';
  let hash = '';
  let manifest = null;
  let transferBytes = null;
  let revision = 0;

  const resetDerived = () => {
    revision += 1;
    hash = '';
    manifest = null;
    transferBytes = null;
  };

  const reset = ({ clearInput = false } = {}) => {
    revision += 1;
    owner = null;
    payload = '';
    arrayBuffer = null;
    base64 = '';
    id = '';
    hash = '';
    manifest = null;
    transferBytes = null;
    if (clearInput) {
      input.value = '';
      refreshFilePicker(input);
    }
  };

  const getFile = () => input.files?.[0] ?? null;
  const ensureOwnership = (file) => {
    if (owner === file) return;
    reset();
    owner = file;
    id = createId();
  };

  const getBuffer = async () => {
    const file = getFile();
    if (!file) return null;
    ensureOwnership(file);
    if (arrayBuffer) return arrayBuffer;
    const requestRevision = revision;
    const loaded = await file.arrayBuffer();
    if (requestRevision === revision && owner === file) arrayBuffer = loaded;
    return loaded;
  };

  const getBase64 = async () => {
    const requestRevision = revision;
    const buffer = await getBuffer();
    if (!buffer) return '';
    if (base64) return base64;
    const encoded = encodeBase64(buffer);
    if (requestRevision === revision) base64 = encoded;
    return encoded;
  };

  const getTransferBytes = async () => {
    const requestRevision = revision;
    const buffer = await getBuffer();
    if (!buffer) return null;
    if (transferBytes) return transferBytes;

    const originalBytes = new Uint8Array(buffer);
    if (!isCompressionEnabled()) {
      if (requestRevision === revision) transferBytes = originalBytes;
      return originalBytes;
    }
    if (typeof CompressionStream !== 'function') {
      throw new Error(lookup('file.compressionUnsupported', 'Gzip transfer compression is not supported by this browser. Turn compression off to continue.'));
    }

    const stream = new Blob([originalBytes]).stream().pipeThrough(new CompressionStream('gzip'));
    const compressed = new Uint8Array(await new Response(stream).arrayBuffer());
    if (requestRevision === revision) transferBytes = compressed;
    return compressed;
  };

  const getIntegrityHash = async (manifestBytes, fileBytes) => {
    if (hash) return hash;
    const requestRevision = revision;
    const canonicalBytes = new Uint8Array(manifestBytes.length + fileBytes.length);
    canonicalBytes.set(manifestBytes, 0);
    canonicalBytes.set(fileBytes, manifestBytes.length);
    const digest = await crypto.subtle.digest('SHA-256', canonicalBytes);
    const computed = [...new Uint8Array(digest)]
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
    if (requestRevision === revision) hash = computed;
    return computed;
  };

  return {
    reset,
    resetDerived,
    getFile,
    ensureOwnership,
    getBuffer,
    getBase64,
    getTransferBytes,
    getIntegrityHash,
    getRevision: () => revision,
    isCurrent: (requestRevision) => requestRevision === revision,
    getId: () => id,
    getPayload: () => payload,
    setPayload: (value) => { payload = value; },
    getManifest: () => manifest,
    setManifest: (value) => { manifest = value; },
    getCachedTransferBytes: () => transferBytes,
  };
}
