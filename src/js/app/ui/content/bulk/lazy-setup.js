import { createBulkImportSection } from './section.js';
import { getBulkElements } from './elements.js';

export function createLazyBulkSystem({
  document,
  enabled,
  format,
  taskProgress,
  runtime,
}) {
  const elements = getBulkElements(document);
  const section = createBulkImportSection({
    enabled,
    format,
    ...elements,
    fileFormatButton: document.querySelector(
      '[data-choice-target="qr-format"][data-choice-value="file"]',
    ),
    taskProgress,
    onFormatFallback: runtime.syncChoices,
    onChange: runtime.render,
  });
  return {
    ...section,
    getRowIndex: () => elements.rowIndex,
    hasSelectedFile: () => Boolean(elements.fileInput.files?.[0]),
  };
}
