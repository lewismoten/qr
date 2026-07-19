import assert from 'node:assert/strict';
import { createDownloadDocumentSection } from '../../src/js/app/ui/download/document/section.js';
import { createDownloadImageSection } from '../../src/js/app/ui/download/image/section.js';

const control = (value = '') => ({
  hidden: false,
  textContent: '',
  value,
});

let frameCount = 1;
const current = control();
const format = control('png');
const qualityControls = control();
const quality = control('92');
const qualityValue = control();
const zip = control();
const image = createDownloadImageSection({
  current,
  format,
  qualityControls,
  quality,
  qualityValue,
  zip,
  getFrameCount: () => frameCount,
});

image.sync();
assert.equal(current.textContent, 'Download');
assert.equal(qualityControls.hidden, true);
assert.equal(qualityValue.textContent, '92%');
assert.equal(zip.hidden, true);

frameCount = 3;
format.value = 'jpg';
image.sync();
assert.equal(current.textContent, 'Download current image');
assert.equal(qualityControls.hidden, false);
assert.equal(zip.hidden, false);
assert.equal(zip.textContent, 'Download all 3 as ZIP');

let printSyncs = 0;
const currentPdf = control();
const allPdf = control();
const documentSection = createDownloadDocumentSection({
  allPdf,
  currentPdf,
  getFrameCount: () => frameCount,
  syncPrint: () => {
    printSyncs += 1;
  },
});

frameCount = 1;
documentSection.sync();
assert.equal(currentPdf.textContent, 'Download PDF');
assert.equal(allPdf.hidden, true);

frameCount = 3;
documentSection.sync();
assert.equal(currentPdf.textContent, 'Download current as PDF');
assert.equal(allPdf.hidden, false);
assert.equal(allPdf.textContent, 'Download all 3 as PDF');
assert.equal(printSyncs, 2);

console.log('Download section tests passed.');
