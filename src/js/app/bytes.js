const BYTE_MASK = 0xff;
const BITS_PER_BYTE = 8;
const SECOND_BYTE_SHIFT = BITS_PER_BYTE;
const THIRD_BYTE_SHIFT = BITS_PER_BYTE * 2;
const FOURTH_BYTE_SHIFT = THIRD_BYTE_SHIFT + BITS_PER_BYTE;
const BYTES_PER_UINT64 = 8;
const BINARY_UNIT = 1024;
const DECIMAL_RADIX = 10;
const HEX_RADIX = 16;
const HEX_BYTE_CHARACTERS = 2;

export function concatBytes(parts) {
  const length = parts.reduce((total, part) => total + part.length, 0);
  const result = new Uint8Array(length);
  let offset = 0;
  parts.forEach((part) => {
    result.set(part, offset);
    offset += part.length;
  });
  return result;
}

export function textBytes(value) {
  return new TextEncoder().encode(value);
}

export function pushUint16LE(bytes, value) {
  bytes.push(value & BYTE_MASK, (value >>> SECOND_BYTE_SHIFT) & BYTE_MASK);
}

export function pushUint32LE(bytes, value) {
  bytes.push(
    value & BYTE_MASK,
    (value >>> SECOND_BYTE_SHIFT) & BYTE_MASK,
    (value >>> THIRD_BYTE_SHIFT) & BYTE_MASK,
    (value >>> FOURTH_BYTE_SHIFT) & BYTE_MASK,
  );
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= BINARY_UNIT && unitIndex < units.length - 1) {
    value /= BINARY_UNIT;
    unitIndex += 1;
  }

  const decimals = value >= DECIMAL_RADIX || unitIndex === 0 ? 0 : 1;
  return `${value.toFixed(decimals)} ${units[unitIndex]}`;
}

export function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / HEX_BYTE_CHARACTERS);
  for (let index = 0; index < bytes.length; index += 1) {
    const start = index * HEX_BYTE_CHARACTERS;
    bytes[index] = Number.parseInt(
      hex.slice(start, start + HEX_BYTE_CHARACTERS),
      HEX_RADIX,
    );
  }
  return bytes;
}

export function uint64Bytes(value) {
  const bytes = new Uint8Array(BYTES_PER_UINT64);
  new DataView(bytes.buffer).setBigUint64(
    0,
    BigInt(Math.max(0, value || 0)),
    false,
  );
  return bytes;
}
