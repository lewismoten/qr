export function getPrintElements(document) {
  return {
    printWidthAuto: document.getElementById('print-width-auto'),
    printWidth: document.getElementById('print-width'),
    printWidthValue: document.getElementById('print-width-value'),
  };
}
