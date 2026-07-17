export function createDownloadDocumentSection({ allPdf, getFrameCount, syncPrint }) {
  const sync = () => {
    const count = getFrameCount();
    allPdf.hidden = count <= 1;
    if (count > 1) allPdf.textContent = `Download all ${count} as PDF`;
    syncPrint();
  };
  return { sync };
}
