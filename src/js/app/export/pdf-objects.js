import { concatBytes, textBytes } from '../bytes.js';
import { MEDIA_TYPE_PDF } from '../media-types.js';

const PDF_BITS_PER_COLOR_COMPONENT = 8;
const PDF_DECIMAL_PLACES = 3;
const PDF_STREAM_START = '\nstream\n';
const PDF_STREAM_END = 'endstream';
const LINE_FEED_BYTE = 0x0a;
const CARRIAGE_RETURN_BYTE = 0x0d;
const PDF_FILE_HEADER = '%PDF-1.4\n';
const PDF_OBJECT_END = '\nendobj\n';
const PDF_XREF_OFFSET_WIDTH = 10;
const PDF_FREE_OBJECT_ENTRY = '0000000000 65535 f \n';
export const PDF_CATALOG_REFERENCE = 1;
export const PDF_PAGES_REFERENCE = 2;

function createDictionary(entries) {
  return `<< ${entries.filter(Boolean).join(' ')} >>`;
}

export function createPdfReference(reference) {
  return `${reference} 0 R`;
}

export function createPdfCatalogDictionary(pagesReference) {
  return createDictionary([
    '/Type /Catalog',
    `/Pages ${createPdfReference(pagesReference)}`,
  ]);
}

export function createPdfPagesDictionary(pageReferences) {
  const kids = pageReferences.map(createPdfReference).join(' ');
  return createDictionary([
    '/Type /Pages',
    `/Kids [${kids}]`,
    `/Count ${pageReferences.length}`,
  ]);
}

function createPdfResourcesDictionary(images) {
  const imageEntries = images
    .map(({ name, reference }) => `/${name} ${createPdfReference(reference)}`)
    .join(' ');
  return createDictionary([`/XObject ${createDictionary([imageEntries])}`]);
}

export function createPdfPageDictionary({
  parentReference,
  width,
  height,
  images,
  contentReference,
}) {
  return createDictionary([
    '/Type /Page',
    `/Parent ${createPdfReference(parentReference)}`,
    `/MediaBox [0 0 ${width} ${height}]`,
    `/Resources ${createPdfResourcesDictionary(images)}`,
    `/Contents ${createPdfReference(contentReference)}`,
  ]);
}

function hasTrailingLineBreak(bytes) {
  const finalByte = bytes.at(-1);
  return finalByte === LINE_FEED_BYTE || finalByte === CARRIAGE_RETURN_BYTE;
}

function createPdfStream(data, dictionaryEntries = []) {
  const bytes = typeof data === 'string' ? textBytes(data) : data;
  const suffix = hasTrailingLineBreak(bytes)
    ? PDF_STREAM_END
    : `\n${PDF_STREAM_END}`;
  return concatBytes([
    textBytes(
      `${createDictionary([
        ...dictionaryEntries,
        `/Length ${bytes.length}`,
      ])}${PDF_STREAM_START}`,
    ),
    bytes,
    textBytes(suffix),
  ]);
}

export function createPdfImageStream({ width, height, jpeg }) {
  return createPdfStream(jpeg, [
    '/Type /XObject',
    '/Subtype /Image',
    `/Width ${width}`,
    `/Height ${height}`,
    '/ColorSpace /DeviceRGB',
    `/BitsPerComponent ${PDF_BITS_PER_COLOR_COMPONENT}`,
    '/Filter /DCTDecode',
  ]);
}

export function createPdfContentStream(content) {
  return createPdfStream(content);
}

export function createPdfDrawImageCommand({
  name,
  width,
  height,
  x = 0,
  y = 0,
}) {
  const values = [width, height, x, y].map((value) =>
    value.toFixed(PDF_DECIMAL_PLACES),
  );
  const [drawWidth, drawHeight, drawX, drawY] = values;
  return (
    `q\n${drawWidth} 0 0 ${drawHeight} ${drawX} ${drawY} cm\n` +
    `/${name} Do\nQ\n`
  );
}

function createPdfCrossReference(offsets, xrefOffset, objectCount) {
  const entries = offsets
    .slice(1)
    .map(
      (offset) =>
        `${String(offset).padStart(PDF_XREF_OFFSET_WIDTH, '0')} 00000 n \n`,
    )
    .join('');
  return (
    `xref\n0 ${objectCount + 1}\n${PDF_FREE_OBJECT_ENTRY}${entries}` +
    `trailer\n${createDictionary([
      `/Size ${objectCount + 1}`,
      `/Root ${createPdfReference(PDF_CATALOG_REFERENCE)}`,
    ])}\nstartxref\n${xrefOffset}\n%%EOF`
  );
}

export function createPdfDocumentBlob(objects) {
  const parts = [textBytes(PDF_FILE_HEADER)];
  const offsets = [0];
  let length = parts[0].length;
  objects.forEach((object, index) => {
    offsets.push(length);
    const part = concatBytes([
      textBytes(`${index + 1} 0 obj\n`),
      object,
      textBytes(PDF_OBJECT_END),
    ]);
    parts.push(part);
    length += part.length;
  });
  parts.push(
    textBytes(createPdfCrossReference(offsets, length, objects.length)),
  );
  return new Blob(parts, { type: MEDIA_TYPE_PDF });
}
