import { concatBytes, textBytes } from './bytes.js';
import { canvasToBlob } from './canvas-export.js';

export async function createPdfBlob(sourceCanvas, quality, printWidthInches) {
  const jpegBlob = await canvasToBlob(
    sourceCanvas,
    'image/jpeg',
    quality,
    true
  );
  const jpeg = new Uint8Array(await jpegBlob.arrayBuffer());
  const pixelWidth = sourceCanvas.width;
  const pixelHeight = sourceCanvas.height;
  const width = printWidthInches * 72;
  const height = width * (pixelHeight / pixelWidth);
  const content = `q\n${width.toFixed(3)} 0 0 ${height.toFixed(3)} 0 0 cm\n/Im0 Do\nQ\n`;
  const objects = [
    textBytes('<< /Type /Catalog /Pages 2 0 R >>'),
    textBytes('<< /Type /Pages /Kids [3 0 R] /Count 1 >>'),
    textBytes(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width.toFixed(3)} ${height.toFixed(3)}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`),
    concatBytes([
      textBytes(`<< /Type /XObject /Subtype /Image /Width ${pixelWidth} /Height ${pixelHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`),
      jpeg,
      textBytes('\nendstream'),
    ]),
    textBytes(`<< /Length ${textBytes(content).length} >>\nstream\n${content}endstream`),
  ];
  return createPdfDocumentBlob(objects);
}

function createPdfDocumentBlob(objects) {
  const parts = [textBytes('%PDF-1.4\n')];
  const offsets = [0];
  let length = parts[0].length;
  objects.forEach((object, index) => {
    offsets.push(length);
    const part = concatBytes([textBytes(`${index + 1} 0 obj\n`), object, textBytes('\nendobj\n')]);
    parts.push(part);
    length += part.length;
  });
  const xrefOffset = length;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    xref += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  xref += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  parts.push(textBytes(xref));
  return new Blob(parts, { type: 'application/pdf' });
}

export async function capturePdfFrame(sourceCanvas, quality, printWidthInches) {
  const jpegBlob = await canvasToBlob(
    sourceCanvas,
    'image/jpeg',
    quality,
    true
  );
  return {
    width: sourceCanvas.width,
    height: sourceCanvas.height,
    printWidthInches: printWidthInches,
    jpeg: new Uint8Array(await jpegBlob.arrayBuffer()),
  };
}

function getPdfSheetLayout(frames) {
  const pageWidth = 612;
  const pageHeight = 792;
  const margin = 36;
  const gap = 10;
  const printableWidth = pageWidth - margin * 2;
  const printableHeight = pageHeight - margin * 2;
  const printWidth = Math.min(
    printableWidth,
    Math.max(...frames.map((frame) => (frame.printWidthInches || 1.65) * 72))
  );
  const maximumAspectRatio = Math.max(...frames.map((frame) => frame.height / frame.width));
  const printHeight = printWidth * maximumAspectRatio;
  const columns = Math.max(1, Math.floor((printableWidth + gap) / (printWidth + gap)));
  const rows = Math.max(1, Math.floor((printableHeight + gap) / (printHeight + gap)));
  const framesPerPage = columns * rows;
  const cellWidth = (pageWidth - margin * 2 - gap * (columns - 1)) / columns;
  const cellHeight = (pageHeight - margin * 2 - gap * (rows - 1)) / rows;
  return { pageWidth, pageHeight, margin, gap, columns, rows, framesPerPage, cellWidth, cellHeight, printWidth };
}

export function createPdfSheetBlob(frames) {
  const { pageWidth, pageHeight, margin, gap, columns, framesPerPage, cellWidth, cellHeight, printWidth } =
    getPdfSheetLayout(frames);
  const objects = [null, null];
  const pageReferences = [];
  const reserveObject = () => {
    objects.push(null);
    return objects.length;
  };
  const setObject = (reference, value) => {
    objects[reference - 1] = value;
  };

  for (let pageStart = 0; pageStart < frames.length; pageStart += framesPerPage) {
    const pageFrames = frames.slice(pageStart, pageStart + framesPerPage);
    const pageReference = reserveObject();
    const contentReference = reserveObject();
    const imageReferences = pageFrames.map(() => reserveObject());
    const resources = [];
    const commands = [];

    pageFrames.forEach((frame, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const scale = Math.min(printWidth / frame.width, cellWidth / frame.width, cellHeight / frame.height);
      const drawWidth = frame.width * scale;
      const drawHeight = frame.height * scale;
      const x = margin + column * (cellWidth + gap) + (cellWidth - drawWidth) / 2;
      const cellBottom = pageHeight - margin - (row + 1) * cellHeight - row * gap;
      const y = cellBottom + (cellHeight - drawHeight) / 2;
      const imageName = `Im${index + 1}`;
      resources.push(`/${imageName} ${imageReferences[index]} 0 R`);
      commands.push(`q\n${drawWidth.toFixed(3)} 0 0 ${drawHeight.toFixed(3)} ${x.toFixed(3)} ${y.toFixed(3)} cm\n/${imageName} Do\nQ\n`);
      setObject(
        imageReferences[index],
        concatBytes([
          textBytes(`<< /Type /XObject /Subtype /Image /Width ${frame.width} /Height ${frame.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${frame.jpeg.length} >>\nstream\n`),
          frame.jpeg,
          textBytes('\nendstream'),
        ])
      );
    });

    const content = commands.join('');
    setObject(
      pageReference,
      textBytes(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << ${resources.join(' ')} >> >> /Contents ${contentReference} 0 R >>`)
    );
    setObject(contentReference, textBytes(`<< /Length ${textBytes(content).length} >>\nstream\n${content}endstream`));
    pageReferences.push(pageReference);
  }

  objects[0] = textBytes('<< /Type /Catalog /Pages 2 0 R >>');
  objects[1] = textBytes(`<< /Type /Pages /Kids [${pageReferences.map((reference) => `${reference} 0 R`).join(' ')}] /Count ${pageReferences.length} >>`);
  return createPdfDocumentBlob(objects);
}

