import { lookup } from '../../../../i18n/index.js';

export function createDownloadDocumentSection({
  allPdf,
  currentPdf,
  getFrameCount,
  syncPrint,
}) {
  const sync = () => {
    const count = getFrameCount();
    currentPdf.textContent =
      count > 1
        ? lookup('downloadUi.document.current', 'Download current as PDF')
        : lookup('downloadUi.document.download', 'Download PDF');
    allPdf.hidden = count <= 1;
    if (count > 1)
      allPdf.textContent = lookup(
        'download.allPdf',
        'Download all {count} as PDF',
        { count },
      );
    syncPrint();
  };
  return { sync };
}
