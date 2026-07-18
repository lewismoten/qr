import { createBulkImportSection } from './section.js';
import { getBulkElements } from './elements.js';
import { setupFilePicker } from '../../file-picker.js';

export function createLazyBulkSystem({
  document,
  enabled,
  format,
  taskProgress,
  runtime,
}) {
  const elements = getBulkElements(document);
  setupFilePicker(elements.fileInput);
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
