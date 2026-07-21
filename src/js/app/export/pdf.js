import { textBytes } from '../bytes.js';
import { canvasToBlob } from './canvas-export.js';
import { MEDIA_TYPE_JPEG } from '../media-types.js';
import {
  createPdfCatalogDictionary,
  createPdfContentStream,
  createPdfDocumentBlob,
  createPdfDrawImageCommand,
  createPdfImageStream,
  createPdfPageDictionary,
  createPdfPagesDictionary,
} from './pdf-objects.js';

const PDF_POINTS_PER_INCH = 72;
const PDF_DECIMAL_PLACES = 3;
const LETTER_WIDTH_POINTS = 612;
const LETTER_HEIGHT_POINTS = 792;
const SHEET_MARGIN_POINTS = 36;
const SHEET_GAP_POINTS = 10;
const DEFAULT_PRINT_WIDTH_INCHES = 1.65;
const PDF_RESERVED_ROOT_OBJECTS = 2;
const UNASSIGNED_PDF_OBJECT = null;
const PDF_CATALOG_REFERENCE = 1;
const PDF_PAGES_REFERENCE = 2;
const SINGLE_PAGE_REFERENCE = 3;
const SINGLE_IMAGE_REFERENCE = 4;
const SINGLE_CONTENT_REFERENCE = 5;
const SINGLE_IMAGE_NAME = 'Im0';

export async function createPdfBlob(sourceCanvas, quality, printWidthInches) {
  const jpegBlob = await canvasToBlob(
    sourceCanvas,
    MEDIA_TYPE_JPEG,
    quality,
    true,
  );
  const jpeg = new Uint8Array(await jpegBlob.arrayBuffer());
  const pixelWidth = sourceCanvas.width;
  const pixelHeight = sourceCanvas.height;
  const width = printWidthInches * PDF_POINTS_PER_INCH;
  const height = width * (pixelHeight / pixelWidth);
  const content = createPdfDrawImageCommand({
    name: SINGLE_IMAGE_NAME,
    width,
    height,
  });
  const objects = [
    textBytes(createPdfCatalogDictionary(PDF_PAGES_REFERENCE)),
    textBytes(createPdfPagesDictionary([SINGLE_PAGE_REFERENCE])),
    textBytes(
      createPdfPageDictionary({
        parentReference: PDF_PAGES_REFERENCE,
        width: width.toFixed(PDF_DECIMAL_PLACES),
        height: height.toFixed(PDF_DECIMAL_PLACES),
        images: [
          { name: SINGLE_IMAGE_NAME, reference: SINGLE_IMAGE_REFERENCE },
        ],
        contentReference: SINGLE_CONTENT_REFERENCE,
      }),
    ),
    createPdfImageStream({
      width: pixelWidth,
      height: pixelHeight,
      jpeg,
    }),
    createPdfContentStream(content),
  ];
  return createPdfDocumentBlob(objects);
}

export async function capturePdfFrame(sourceCanvas, quality, printWidthInches) {
  const jpegBlob = await canvasToBlob(
    sourceCanvas,
    MEDIA_TYPE_JPEG,
    quality,
    true,
  );
  return {
    width: sourceCanvas.width,
    height: sourceCanvas.height,
    printWidthInches: printWidthInches,
    jpeg: new Uint8Array(await jpegBlob.arrayBuffer()),
  };
}

export function getPdfSheetLayout(frames) {
  const pageWidth = LETTER_WIDTH_POINTS;
  const pageHeight = LETTER_HEIGHT_POINTS;
  const margin = SHEET_MARGIN_POINTS;
  const gap = SHEET_GAP_POINTS;
  const printableWidth = pageWidth - margin * 2;
  const printableHeight = pageHeight - margin * 2;
  const printWidth = Math.min(
    printableWidth,
    Math.max(
      ...frames.map((frame) => {
        return (
          (frame.printWidthInches || DEFAULT_PRINT_WIDTH_INCHES) *
          PDF_POINTS_PER_INCH
        );
      }),
    ),
  );
  const maximumAspectRatio = Math.max(
    ...frames.map((frame) => frame.height / frame.width),
  );
  const printHeight = printWidth * maximumAspectRatio;
  const columns = Math.max(
    1,
    Math.floor((printableWidth + gap) / (printWidth + gap)),
  );
  const rows = Math.max(
    1,
    Math.floor((printableHeight + gap) / (printHeight + gap)),
  );
  const framesPerPage = columns * rows;
  const cellWidth = (pageWidth - margin * 2 - gap * (columns - 1)) / columns;
  const cellHeight = (pageHeight - margin * 2 - gap * (rows - 1)) / rows;
  return {
    pageWidth,
    pageHeight,
    margin,
    gap,
    columns,
    rows,
    framesPerPage,
    cellWidth,
    cellHeight,
    printWidth,
  };
}

export function createPdfSheetBlob(frames) {
  const {
    pageWidth,
    pageHeight,
    margin,
    gap,
    columns,
    framesPerPage,
    cellWidth,
    cellHeight,
    printWidth,
  } = getPdfSheetLayout(frames);
  const objects = Array(PDF_RESERVED_ROOT_OBJECTS).fill(UNASSIGNED_PDF_OBJECT);
  const pageReferences = [];
  const reserveObject = () => {
    objects.push(UNASSIGNED_PDF_OBJECT);
    return objects.length;
  };
  const setObject = (reference, value) => {
    objects[reference - 1] = value;
  };

  for (
    let pageStart = 0;
    pageStart < frames.length;
    pageStart += framesPerPage
  ) {
    const pageFrames = frames.slice(pageStart, pageStart + framesPerPage);
    const pageReference = reserveObject();
    const contentReference = reserveObject();
    const imageReferences = pageFrames.map(() => reserveObject());
    const images = [];
    const commands = [];

    pageFrames.forEach((frame, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const scale = Math.min(
        printWidth / frame.width,
        cellWidth / frame.width,
        cellHeight / frame.height,
      );
      const drawWidth = frame.width * scale;
      const drawHeight = frame.height * scale;
      const x =
        margin + column * (cellWidth + gap) + (cellWidth - drawWidth) / 2;
      const cellBottom =
        pageHeight - margin - (row + 1) * cellHeight - row * gap;
      const y = cellBottom + (cellHeight - drawHeight) / 2;
      const imageName = `Im${index + 1}`;
      images.push({ name: imageName, reference: imageReferences[index] });
      commands.push(
        createPdfDrawImageCommand({
          name: imageName,
          width: drawWidth,
          height: drawHeight,
          x,
          y,
        }),
      );
      setObject(
        imageReferences[index],
        createPdfImageStream({
          width: frame.width,
          height: frame.height,
          jpeg: frame.jpeg,
        }),
      );
    });

    const content = commands.join('');
    setObject(
      pageReference,
      textBytes(
        createPdfPageDictionary({
          parentReference: PDF_PAGES_REFERENCE,
          width: pageWidth,
          height: pageHeight,
          images,
          contentReference,
        }),
      ),
    );
    setObject(contentReference, createPdfContentStream(content));
    pageReferences.push(pageReference);
  }

  objects[PDF_CATALOG_REFERENCE - 1] = textBytes(
    createPdfCatalogDictionary(PDF_PAGES_REFERENCE),
  );
  objects[PDF_PAGES_REFERENCE - 1] = textBytes(
    createPdfPagesDictionary(pageReferences),
  );
  return createPdfDocumentBlob(objects);
}
