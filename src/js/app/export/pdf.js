import { textBytes } from '../bytes.js';
import { createLocalizedError } from '../../localized-error.js';
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
  PDF_CATALOG_REFERENCE,
  PDF_PAGES_REFERENCE,
} from './pdf-objects.js';

const PDF_POINTS_PER_INCH = 72;
const PDF_DECIMAL_PLACES = 3;
const LETTER_WIDTH_POINTS = 612;
const LETTER_HEIGHT_POINTS = 792;
const SHEET_MARGIN_POINTS = 36;
const SHEET_GAP_POINTS = 10;
const DEFAULT_PRINT_WIDTH_INCHES = 1.65;
const UNASSIGNED_PDF_OBJECT = null;
const SINGLE_PAGE_REFERENCE = 3;
const SINGLE_IMAGE_REFERENCE = 4;
const SINGLE_CONTENT_REFERENCE = 5;
const SINGLE_IMAGE_NAME = 'Im0';

export async function createPdfBlob(sourceCanvas, quality, printWidthInches) {
  const frame = await capturePdfFrame(sourceCanvas, quality, printWidthInches);
  const pixelWidth = frame.width;
  const pixelHeight = frame.height;
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
      jpeg: frame.jpeg,
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
  if (frames.length === 0) {
    throw createLocalizedError(
      'download.pdfNeedsFrames',
      'Add at least one QR code before creating a PDF sheet.',
      undefined,
      TypeError,
    );
  }
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
  const cellWidth = (printableWidth - gap * (columns - 1)) / columns;
  const cellHeight = (printableHeight - gap * (rows - 1)) / rows;
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

function createPdfObjectStore(reservedCount) {
  const objects = Array(reservedCount).fill(UNASSIGNED_PDF_OBJECT);
  return {
    objects,
    reserve() {
      objects.push(UNASSIGNED_PDF_OBJECT);
      return objects.length;
    },
    set(reference, value) {
      objects[reference - 1] = value;
    },
  };
}

function getSheetFramePlacement(frame, index, layout) {
  const column = index % layout.columns;
  const row = Math.floor(index / layout.columns);
  const scale = Math.min(
    layout.printWidth / frame.width,
    layout.cellWidth / frame.width,
    layout.cellHeight / frame.height,
  );
  const width = frame.width * scale;
  const height = frame.height * scale;
  const x =
    layout.margin +
    column * (layout.cellWidth + layout.gap) +
    (layout.cellWidth - width) / 2;
  const cellBottom =
    layout.pageHeight -
    layout.margin -
    (row + 1) * layout.cellHeight -
    row * layout.gap;
  const y = cellBottom + (layout.cellHeight - height) / 2;
  return { width, height, x, y };
}

function createPdfSheetPage(pageFrames, layout, store) {
  const pageReference = store.reserve();
  const contentReference = store.reserve();
  const images = [];
  const commands = [];

  pageFrames.forEach((frame, index) => {
    const imageReference = store.reserve();
    const name = `Im${index + 1}`;
    const placement = getSheetFramePlacement(frame, index, layout);
    images.push({ name, reference: imageReference });
    commands.push(createPdfDrawImageCommand({ name, ...placement }));
    store.set(
      imageReference,
      createPdfImageStream({
        width: frame.width,
        height: frame.height,
        jpeg: frame.jpeg,
      }),
    );
  });

  store.set(
    pageReference,
    textBytes(
      createPdfPageDictionary({
        parentReference: PDF_PAGES_REFERENCE,
        width: layout.pageWidth,
        height: layout.pageHeight,
        images,
        contentReference,
      }),
    ),
  );
  store.set(contentReference, createPdfContentStream(commands.join('')));
  return pageReference;
}

export function createPdfSheetBlob(frames) {
  const layout = getPdfSheetLayout(frames);
  const store = createPdfObjectStore(PDF_PAGES_REFERENCE);
  const pageReferences = [];

  for (
    let pageStart = 0;
    pageStart < frames.length;
    pageStart += layout.framesPerPage
  ) {
    const pageFrames = frames.slice(
      pageStart,
      pageStart + layout.framesPerPage,
    );
    pageReferences.push(createPdfSheetPage(pageFrames, layout, store));
  }

  store.set(
    PDF_CATALOG_REFERENCE,
    textBytes(createPdfCatalogDictionary(PDF_PAGES_REFERENCE)),
  );
  store.set(
    PDF_PAGES_REFERENCE,
    textBytes(createPdfPagesDictionary(pageReferences)),
  );
  return createPdfDocumentBlob(store.objects);
}
