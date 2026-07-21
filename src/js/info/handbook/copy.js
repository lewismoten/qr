import { lookup } from '../../i18n/index.js';

export function getHandbookCopy() {
  return {
    title: lookup('info.handbook.title', 'QR Code Generator Handbook'),
    contents: lookup('info.handbook.contents', 'Contents'),
    download: lookup('info.handbook.download', 'Download handbook'),
    choose: lookup('info.handbook.choose', 'Choose a download format.'),
    pdf: lookup('info.handbook.pdf', 'PDF'),
    epub: lookup('info.handbook.epub', 'Download ePub'),
    failed: lookup(
      'info.handbook.failed',
      'The handbook could not be created.',
    ),
    cancel: lookup('info.handbook.cancel', 'Cancel'),
    creatingPdf: lookup(
      'info.handbook.creatingPdf',
      'Creating PDF handbook...',
    ),
    creatingEpub: lookup(
      'info.handbook.creatingEpub',
      'Creating EPUB handbook...',
    ),
  };
}
