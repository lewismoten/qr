import { uint64Bytes } from '../../../bytes.js';

export function buildManifestFields({ file, customMetadata, validationValue, fieldTypes }) {
  const encoder = new TextEncoder();
  const fields = [
    { type: fieldTypes.name, value: encoder.encode(file?.name || 'file.bin') },
    { type: fieldTypes.mimeType, value: encoder.encode(file?.type?.trim() || 'application/octet-stream') },
    { type: fieldTypes.modifiedAt, value: uint64Bytes(file?.lastModified || 0) },
    { type: fieldTypes.originalSize, value: uint64Bytes(file?.size || 0) },
    { type: fieldTypes.validationType, value: encoder.encode('SHA-256') },
    { type: fieldTypes.validationValue, value: validationValue },
  ];
  if (customMetadata) {
    fields.push({ type: fieldTypes.customMetadata, value: encoder.encode(customMetadata) });
  }
  return fields;
}

export function getSerializedManifestLength(fields, headerBytes, fieldHeaderBytes) {
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
  const length = getSerializedManifestLength(fields, headerBytes, fieldHeaderBytes);
  const manifest = new Uint8Array(length);
  const view = new DataView(manifest.buffer);
  manifest.set(new TextEncoder().encode(magic), 0);
  manifest[4] = Number.parseInt(version, 10);
  manifest[5] = flags;
  view.setUint32(6, length, false);
  let offset = headerBytes;
  fields.forEach((field) => {
    if (field.value.length > 0xffff) {
      throw new Error(`Manifest field ${field.type} exceeds the 65,535-byte limit.`);
    }
    manifest[offset] = field.type;
    view.setUint16(offset + 1, field.value.length, false);
    manifest.set(field.value, offset + fieldHeaderBytes);
    offset += fieldHeaderBytes + field.value.length;
  });
  return manifest;
}
