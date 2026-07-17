import { lookup } from '../../../../i18n/index.js';

export function createDownloadDocumentSection({ allPdf, getFrameCount, syncPrint }) {
  const sync = () => {
    const count = getFrameCount();
    allPdf.hidden = count <= 1;
    if (count > 1) allPdf.textContent = lookup('download.allPdf', 'Download all {count} as PDF', { count });
    syncPrint();
  };
  return { sync };
}
