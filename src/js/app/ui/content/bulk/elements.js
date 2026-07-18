export function getBulkElements(document) {
  const id = (name) => document.getElementById(name);
  return {
    fields: id('bulk-fields'),
    expectedFields: id('bulk-expected-fields'),
    requiredFields: id('bulk-required-fields'),
    fileInput: id('bulk-file-input'),
    rowIndex: id('bulk-row-index'),
    status: id('bulk-status'),
    clearButton: id('bulk-clear'),
  };
}
