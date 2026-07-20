const CRC32_TABLE_SIZE = 256;
const CRC32_POLYNOMIAL = 0xedb88320;
const CRC32_INITIAL_VALUE = 0xffffffff;
const BITS_PER_BYTE = 8;
const BYTE_MASK = 0xff;

const CRC32_TABLE = Uint32Array.from(
  { length: CRC32_TABLE_SIZE },
  (_, value) => {
    let crc = value;
    for (let bit = 0; bit < BITS_PER_BYTE; bit += 1) {
      crc = crc & 1 ? CRC32_POLYNOMIAL ^ (crc >>> 1) : crc >>> 1;
    }
    return crc >>> 0;
  },
);

export function getCrc32(bytes) {
  let crc = CRC32_INITIAL_VALUE;
  bytes.forEach((byte) => {
    crc = CRC32_TABLE[(crc ^ byte) & BYTE_MASK] ^ (crc >>> BITS_PER_BYTE);
  });
  return (crc ^ CRC32_INITIAL_VALUE) >>> 0;
}
