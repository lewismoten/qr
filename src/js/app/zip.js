import { concatBytes, textBytes } from './bytes.js';

const CRC_TABLE = Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit += 1) {
    crc = (crc & 1) ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  return crc >>> 0;
});

function getCrc32(bytes) {
  let crc = 0xffffffff;
  bytes.forEach((byte) => {
    crc = CRC_TABLE[(crc ^ byte) & 255] ^ (crc >>> 8);
  });
  return (crc ^ 0xffffffff) >>> 0;
}

export async function createZipBlob(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  for (const file of files) {
    const name = textBytes(file.name);
    const data = new Uint8Array(await file.blob.arrayBuffer());
    const crc = getCrc32(data);
    const local = [];
    pushUint32(local, 0x04034b50);
    pushUint16(local, 20);
    pushUint16(local, 0x0800);
    pushUint16(local, 0);
    pushUint16(local, 0);
    pushUint16(local, 0);
    pushUint32(local, crc);
    pushUint32(local, data.length);
    pushUint32(local, data.length);
    pushUint16(local, name.length);
    pushUint16(local, 0);
    const localPart = concatBytes([new Uint8Array(local), name, data]);
    localParts.push(localPart);

    const central = [];
    pushUint32(central, 0x02014b50);
    pushUint16(central, 20);
    pushUint16(central, 20);
    pushUint16(central, 0x0800);
    pushUint16(central, 0);
    pushUint16(central, 0);
    pushUint16(central, 0);
    pushUint32(central, crc);
    pushUint32(central, data.length);
    pushUint32(central, data.length);
    pushUint16(central, name.length);
    pushUint16(central, 0);
    pushUint16(central, 0);
    pushUint16(central, 0);
    pushUint16(central, 0);
    pushUint32(central, 0);
    pushUint32(central, offset);
    centralParts.push(concatBytes([new Uint8Array(central), name]));
    offset += localPart.length;
  }
  const centralDirectory = concatBytes(centralParts);
  const end = [];
  pushUint32(end, 0x06054b50);
  pushUint16(end, 0);
  pushUint16(end, 0);
  pushUint16(end, files.length);
  pushUint16(end, files.length);
  pushUint32(end, centralDirectory.length);
  pushUint32(end, offset);
  pushUint16(end, 0);
  return new Blob([...localParts, centralDirectory, new Uint8Array(end)], { type: 'application/zip' });
}

