export function getDebugElements(document, core) {
  const id = (name) => document.getElementById(name);
  return {
    ...core,
    maskGrid: id('mask-grid'),
    detectedMode: id('detected-mode'),
    segmentSummary: id('segment-summary'),
    versionSummary: id('version-summary'),
    unusedSummary: id('unused-summary'),
    modeValidation: id('mode-validation'),
    bulkFields: id('bulk-fields'),
    debugEnabled: id('debug-enabled'),
    debugUnmask: id('debug-unmask'),
    outlineButtons: document.querySelectorAll('.outline-mode-button'),
  };
}
