import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  createPdfCatalogDictionary,
  createPdfContentStream,
  createPdfDrawImageCommand,
  createPdfImageStream,
  createPdfPageDictionary,
  createPdfPagesDictionary,
} from '../../src/js/app/export/pdf-objects.js';
import {
  createPdfSheetBlob,
  getPdfSheetLayout,
} from '../../src/js/app/export/pdf.js';

const decoder = new TextDecoder();
const FIRST_PAGE_REFERENCE = 3;
const SECOND_PAGE_REFERENCE = 8;
const LARGE_PRINT_WIDTH_INCHES = 7.5;
const JPEG_START_MARKER = 0xff;
const JPEG_START_OF_IMAGE = 0xd8;
const SAMPLE_JPEG = new Uint8Array([
  JPEG_START_MARKER,
  JPEG_START_OF_IMAGE,
  JPEG_START_MARKER,
]);

describe('PDF object builders', () => {
  test('builds catalog, page-tree, and page dictionaries', () => {
    assert.equal(
      createPdfCatalogDictionary(2),
      '<< /Type /Catalog /Pages 2 0 R >>',
    );
    assert.equal(
      createPdfPagesDictionary([FIRST_PAGE_REFERENCE, SECOND_PAGE_REFERENCE]),
      '<< /Type /Pages /Kids [3 0 R 8 0 R] /Count 2 >>',
    );
    assert.equal(
      createPdfPageDictionary({
        parentReference: 2,
        width: 612,
        height: 792,
        images: [{ name: 'Im1', reference: 5 }],
        contentReference: 4,
      }),
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] ' +
        '/Resources << /XObject << /Im1 5 0 R >> >> ' +
        '/Contents 4 0 R >>',
    );
  });

  test('builds content and JPEG image streams with exact lengths', () => {
    const command = createPdfDrawImageCommand({
      name: 'Im1',
      width: 72,
      height: 36,
      x: 9,
      y: 18,
    });
    assert.equal(command, 'q\n72.000 0 0 36.000 9.000 18.000 cm\n/Im1 Do\nQ\n');
    assert.equal(
      decoder.decode(createPdfContentStream(command)),
      `<< /Length ${command.length} >>\nstream\n${command}endstream`,
    );

    const jpeg = SAMPLE_JPEG;
    const stream = createPdfImageStream({ width: 10, height: 20, jpeg });
    const header =
      '<< /Type /XObject /Subtype /Image /Width 10 /Height 20 ' +
      '/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode ' +
      '/Length 3 >>\nstream\n';
    assert.equal(decoder.decode(stream.slice(0, header.length)), header);
    assert.deepEqual(
      [...stream.slice(header.length, header.length + jpeg.length)],
      [...jpeg],
    );
    assert.equal(
      decoder.decode(stream.slice(header.length + jpeg.length)),
      '\nendstream',
    );
  });

  test('assembles a complete PDF sheet from captured frames', async () => {
    const frame = {
      width: 100,
      height: 100,
      printWidthInches: LARGE_PRINT_WIDTH_INCHES,
      jpeg: SAMPLE_JPEG,
    };
    const blob = createPdfSheetBlob([frame, frame]);
    const text = decoder.decode(await blob.arrayBuffer());
    assert.equal(blob.type, 'application/pdf');
    assert.match(text, /^%PDF-1\.4/);
    assert.match(text, /\/Type \/Catalog/);
    assert.match(text, /\/Type \/Pages/);
    assert.match(text, /\/Kids \[3 0 R 6 0 R\] \/Count 2/);
    assert.match(text, /\/Type \/Page/);
    assert.match(text, /xref/);
    assert.match(text, /%%EOF$/);
  });

  test('rejects an empty PDF sheet before calculating layout', () => {
    assert.throws(
      () => getPdfSheetLayout([]),
      (error) => {
        assert.ok(error instanceof TypeError);
        assert.equal(error.i18nKey, 'download.pdfFramesRequired');
        assert.equal(
          error.message,
          'Add at least one QR code before creating a PDF sheet.',
        );
        return true;
      },
    );
  });
});
