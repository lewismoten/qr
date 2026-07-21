import { lookup } from '../../i18n/index.js';

export function getHandbookCopy() {
  return {
    title: lookup('info.handbook.title', 'QR Code Generator Handbook'),
    contents: lookup('info.handbook.contents', 'Contents'),
    download: lookup('info.handbook.download', 'Download handbook'),
    choose: lookup('info.handbook.choose', 'Choose a download format.'),
    pdf: lookup('info.handbook.pdf', 'PDF'),
    epub: lookup('info.handbook.epub', 'Download ePub'),
    subtitle: lookup(
      'info.handbook.subtitle',
      'An offline guide to creating, styling, inspecting, and exporting QR codes',
    ),
    author: lookup('info.handbook.author', 'Author'),
    published: lookup('info.handbook.published', 'Published'),
    prefaceTitle: lookup('info.handbook.prefaceTitle', 'About this edition'),
    prefaceIntroduction: lookup(
      'info.handbook.prefaceIntroduction',
      'This handbook is generated from the QR Code Generator website for offline reading.',
    ),
    prefaceCaveat: lookup(
      'info.handbook.prefaceCaveat',
      'It combines web guides, technical references, and interface help. It has not received the editing or sequential arrangement of a conventional book, so some topics can repeat or refer to the interactive application.',
    ),
    failed: lookup(
      'info.handbook.failed',
      'The handbook could not be created.',
    ),
    cancel: lookup('info.handbook.cancel', 'Cancel'),
    creatingPdf: lookup(
      'info.handbook.creatingPdf',
      'Preparing handbook for PDF printing...',
    ),
    creatingEpub: lookup(
      'info.handbook.creatingEpub',
      'Creating EPUB handbook...',
    ),
    sections: {
      content: lookup('navigation.content', 'Content'),
      style: lookup('navigation.style', 'Style'),
      download: lookup('navigation.download', 'Download'),
      debug: lookup('navigation.debug', 'Debug'),
    },
    divisions: {
      about: lookup('footer.about', 'About'),
      guides: lookup('footer.guides', 'Guides'),
      spec: lookup('footer.specification', 'QR spec'),
      technology: lookup(
        'info.handbook.technologyDivision',
        'Technology and licenses',
      ),
      privacy: lookup('footer.privacy', 'Privacy'),
    },
  };
}
