import { hexToBytes, uint64Bytes } from '../../../bytes.js';
import { createLocalizedError } from '../../../../localized-error.js';

export function buildManifestFields({
  file,
  customMetadata,
  validationValue,
  fieldTypes,
}) {
  const encoder = new TextEncoder();
  const fields = [
    { type: fieldTypes.name, value: encoder.encode(file?.name || 'file.bin') },
    {
      type: fieldTypes.mimeType,
      value: encoder.encode(file?.type?.trim() || 'application/octet-stream'),
    },
    {
      type: fieldTypes.modifiedAt,
      value: uint64Bytes(file?.lastModified || 0),
    },
    { type: fieldTypes.originalSize, value: uint64Bytes(file?.size || 0) },
    { type: fieldTypes.validationType, value: encoder.encode('SHA-256') },
    { type: fieldTypes.validationValue, value: validationValue },
  ];
  if (customMetadata) {
    fields.push({
      type: fieldTypes.customMetadata,
      value: encoder.encode(customMetadata),
    });
  }
  return fields;
}

export function getSerializedManifestLength(
  fields,
  headerBytes,
  fieldHeaderBytes,
) {
  return fields.reduce(
    (length, field) => length + fieldHeaderBytes + field.value.length,
    headerBytes,
  );
}

export function serializeManifest({
  fields,
  magic,
  version,
  flags,
  headerBytes,
  fieldHeaderBytes,
}) {
  const length = getSerializedManifestLength(
    fields,
    headerBytes,
    fieldHeaderBytes,
  );
  const manifest = new Uint8Array(length);
  const view = new DataView(manifest.buffer);
  manifest.set(new TextEncoder().encode(magic), 0);
  manifest[4] = Number.parseInt(version, 10);
  manifest[5] = flags;
  view.setUint32(6, length, false);
  let offset = headerBytes;
  fields.forEach((field) => {
    if (field.value.length > 0xffff) {
      throw createLocalizedError(
        'file.manifestFieldLimit',
        'Manifest field {type} exceeds the 65,535-byte limit.',
        { type: field.type },
      );
    }
    manifest[offset] = field.type;
    view.setUint16(offset + 1, field.value.length, false);
    manifest.set(field.value, offset + fieldHeaderBytes);
    offset += fieldHeaderBytes + field.value.length;
  });
  return manifest;
}

export function createFileManifestController({
  cache,
  includeManifest,
  getCustomMetadata,
  isCompressionEnabled,
  protocol,
}) {
  const normalizeCustomMetadata = ({ validate = false } = {}) => {
    const value = getCustomMetadata().trim();
    if (!value) return '';

    try {
      return JSON.stringify(JSON.parse(value));
    } catch (error) {
      if (validate) {
        const localizedError = createLocalizedError(
          'file.metadataJson',
          'Custom file metadata must be valid JSON.',
        );
        localizedError.cause = error;
        throw localizedError;
      }
      return value;
    }
  };

  const getFields = (file, { validationValue = new Uint8Array(32) } = {}) =>
    buildManifestFields({
      file,
      customMetadata: normalizeCustomMetadata(),
      validationValue,
      fieldTypes: protocol.fieldTypes,
    });

  const encode = (fields) =>
    serializeManifest({
      fields,
      magic: protocol.magic,
      version: protocol.version,
      flags: isCompressionEnabled() ? protocol.flags.gzip : 0,
      headerBytes: protocol.headerBytes,
      fieldHeaderBytes: protocol.fieldHeaderBytes,
    });

  const getByteLength = (file) => {
    if (!includeManifest()) return 0;
    return getSerializedManifestLength(
      getFields(file),
      protocol.headerBytes,
      protocol.fieldHeaderBytes,
    );
  };

  const getManifest = async (transferBytes = null) => {
    const file = cache.getFile();
    if (!file) return null;
    if (!includeManifest()) return new Uint8Array(0);

    cache.ensureOwnership(file);
    const settingsRevision = cache.getRevision();
    if (cache.getManifest()) return cache.getManifest();

    normalizeCustomMetadata({ validate: true });
    const bytesToTransfer = transferBytes || (await cache.getTransferBytes());
    const canonicalManifest = encode(getFields(file));
    const validationValue = hexToBytes(
      await cache.getIntegrityHash(canonicalManifest, bytesToTransfer),
    );
    const manifest = encode(getFields(file, { validationValue }));
    if (cache.isCurrent(settingsRevision)) cache.setManifest(manifest);
    return manifest;
  };

  return { getByteLength, getManifest, normalizeCustomMetadata };
}
