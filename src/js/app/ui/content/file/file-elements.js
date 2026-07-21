export function getFileElements(document, core) {
  const id = (name) => document.getElementById(name);
  return {
    input: id('file-input'),
    format: core.qrFormat,
    mode: id('file-encoding-mode'),
    capacityHint: id('file-capacity-hint'),
    clearButton: id('clear-file-button'),
    chunkControls: id('file-chunk-controls'),
    chunkVersionAuto: id('file-chunk-version-auto'),
    chunkVersion: id('file-chunk-version'),
    versionLabel: id('file-chunk-version-value'),
    includeManifest: id('file-include-manifest'),
    compressTransfer: id('file-compress-transfer'),
    customMetadata: id('file-custom-metadata'),
    chunkIndex: id('file-chunk-index'),
    chunkIndexValue: id('file-chunk-index-value'),
    versionAuto: core.versionAuto,
    qrVersion: core.qrVersion,
  };
}
