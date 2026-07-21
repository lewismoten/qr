import {
  concatBytes,
  pushUint16LE,
  pushUint32LE,
  textBytes,
} from '../bytes.js';
import { getCrc32 } from '../checksum/crc32.js';
import { MEDIA_TYPE_ZIP } from '../media-types.js';

const ZIP_LOCAL_HEADER_SIGNATURE = 0x04034b50;
const ZIP_CENTRAL_HEADER_SIGNATURE = 0x02014b50;
const ZIP_END_SIGNATURE = 0x06054b50;
const ZIP_CREATOR_VERSION = 20;
const ZIP_REQUIRED_VERSION = 20;
const ZIP_UTF8_FLAG = 0x0800;
const ZIP_STORE_METHOD = 0;
const ZIP_DOS_TIME_UNSPECIFIED = 0;
const ZIP_DOS_DATE_UNSPECIFIED = 0;
const ZIP_NO_EXTRA_FIELD = 0;
const ZIP_NO_FILE_COMMENT = 0;
const ZIP_START_DISK = 0;
const ZIP_INTERNAL_ATTRIBUTES = 0;
const ZIP_EXTERNAL_ATTRIBUTES = 0;
const ZIP_CURRENT_DISK = 0;
const ZIP_CENTRAL_DIRECTORY_DISK = 0;
const ZIP_NO_ARCHIVE_COMMENT = 0;

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
    pushUint16LE(local, ZIP_REQUIRED_VERSION);
    pushUint16LE(local, ZIP_UTF8_FLAG);
    pushUint16LE(local, ZIP_STORE_METHOD);
    pushUint16LE(local, ZIP_DOS_TIME_UNSPECIFIED);
    pushUint16LE(local, ZIP_DOS_DATE_UNSPECIFIED);
    pushUint32LE(local, crc);
    pushUint32LE(local, data.length);
    pushUint32LE(local, data.length);
    pushUint16LE(local, name.length);
    pushUint16LE(local, ZIP_NO_EXTRA_FIELD);
    const localPart = concatBytes([new Uint8Array(local), name, data]);
    localParts.push(localPart);

    const central = [];
    pushUint32LE(central, ZIP_CENTRAL_HEADER_SIGNATURE);
    pushUint16LE(central, ZIP_CREATOR_VERSION);
    pushUint16LE(central, ZIP_REQUIRED_VERSION);
    pushUint16LE(central, ZIP_UTF8_FLAG);
    pushUint16LE(central, ZIP_STORE_METHOD);
    pushUint16LE(central, ZIP_DOS_TIME_UNSPECIFIED);
    pushUint16LE(central, ZIP_DOS_DATE_UNSPECIFIED);
    pushUint32LE(central, crc);
    pushUint32LE(central, data.length);
    pushUint32LE(central, data.length);
    pushUint16LE(central, name.length);
    pushUint16LE(central, ZIP_NO_EXTRA_FIELD);
    pushUint16LE(central, ZIP_NO_FILE_COMMENT);
    pushUint16LE(central, ZIP_START_DISK);
    pushUint16LE(central, ZIP_INTERNAL_ATTRIBUTES);
    pushUint32LE(central, ZIP_EXTERNAL_ATTRIBUTES);
    pushUint32LE(central, offset);
    centralParts.push(concatBytes([new Uint8Array(central), name]));
    offset += localPart.length;
  }
  const centralDirectory = concatBytes(centralParts);
  const end = [];
  pushUint32LE(end, ZIP_END_SIGNATURE);
  pushUint16LE(end, ZIP_CURRENT_DISK);
  pushUint16LE(end, ZIP_CENTRAL_DIRECTORY_DISK);
  pushUint16LE(end, files.length);
  pushUint16LE(end, files.length);
  pushUint32LE(end, centralDirectory.length);
  pushUint32LE(end, offset);
  pushUint16LE(end, ZIP_NO_ARCHIVE_COMMENT);
  return new Blob([...localParts, centralDirectory, new Uint8Array(end)], {
    type: MEDIA_TYPE_ZIP,
  });
}
