import {
  concatBytes,
  pushUint16LE,
  pushUint32LE,
  textBytes,
} from '../bytes.js';
import { getCrc32 } from '../checksum/crc32.js';

const ZIP_LOCAL_HEADER_SIGNATURE = 0x04034b50;
const ZIP_CENTRAL_HEADER_SIGNATURE = 0x02014b50;
const ZIP_END_SIGNATURE = 0x06054b50;
const ZIP_VERSION = 20;
const ZIP_UTF8_FLAG = 0x0800;

export async function createZipBlob(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  for (const file of files) {
    const name = textBytes(file.name);
    const data = new Uint8Array(await file.blob.arrayBuffer());
    const crc = getCrc32(data);
    const local = [];
    pushUint32LE(local, ZIP_LOCAL_HEADER_SIGNATURE);
    pushUint16LE(local, ZIP_VERSION);
    pushUint16LE(local, ZIP_UTF8_FLAG);
    pushUint16LE(local, 0);
    pushUint16LE(local, 0);
    pushUint16LE(local, 0);
    pushUint32LE(local, crc);
    pushUint32LE(local, data.length);
    pushUint32LE(local, data.length);
    pushUint16LE(local, name.length);
    pushUint16LE(local, 0);
    const localPart = concatBytes([new Uint8Array(local), name, data]);
    localParts.push(localPart);

    const central = [];
    pushUint32LE(central, ZIP_CENTRAL_HEADER_SIGNATURE);
    pushUint16LE(central, ZIP_VERSION);
    pushUint16LE(central, ZIP_VERSION);
    pushUint16LE(central, ZIP_UTF8_FLAG);
    pushUint16LE(central, 0);
    pushUint16LE(central, 0);
    pushUint16LE(central, 0);
    pushUint32LE(central, crc);
    pushUint32LE(central, data.length);
    pushUint32LE(central, data.length);
    pushUint16LE(central, name.length);
    pushUint16LE(central, 0);
    pushUint16LE(central, 0);
    pushUint16LE(central, 0);
    pushUint16LE(central, 0);
    pushUint32LE(central, 0);
    pushUint32LE(central, offset);
    centralParts.push(concatBytes([new Uint8Array(central), name]));
    offset += localPart.length;
  }
  const centralDirectory = concatBytes(centralParts);
  const end = [];
  pushUint32LE(end, ZIP_END_SIGNATURE);
  pushUint16LE(end, 0);
  pushUint16LE(end, 0);
  pushUint16LE(end, files.length);
  pushUint16LE(end, files.length);
  pushUint32LE(end, centralDirectory.length);
  pushUint32LE(end, offset);
  pushUint16LE(end, 0);
  return new Blob([...localParts, centralDirectory, new Uint8Array(end)], {
    type: 'application/zip',
  });
}
