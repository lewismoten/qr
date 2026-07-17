import { createBulkImportSection } from './bulk/section.js';
import { arrayBufferToBase64, createCompactFileId } from './file/protocol.js';
import { createFileSetup } from './file/setup.js';

export function createContentDataSetup({ document, elements: e, encoder, protocol, runtime }) {
  const file = createFileSetup({
    elements: {
      input: e.fileInput, format: e.qrFormat, mode: e.fileEncodingMode,
      capacityHint: e.fileCapacityHint, clearButton: e.clearFileButton,
      chunkControls: e.fileChunkControls, chunkVersionAuto: e.fileChunkVersionAuto,
      chunkVersion: e.fileChunkVersion, chunkVersionValue: e.fileChunkVersionValue,
      includeManifest: e.fileIncludeManifest, compressTransfer: e.fileCompressTransfer,
      customMetadata: e.fileCustomMetadata, chunkIndex: e.fileChunkIndex,
      chunkIndexValue: e.fileChunkIndexValue, versionAuto: e.versionAuto,
      qrVersion: e.qrVersion,
    },
    encoder,
    protocol,
    createId: createCompactFileId,
    encodeBase64: arrayBufferToBase64,
    runtime: {
      buildOptions: runtime.buildOptions,
      buildPayload: runtime.buildPayload,
      getEncodingMode: runtime.getEncodingMode,
      getShareableAppUrl: runtime.getShareableAppUrl,
      syncNavigation: runtime.syncNavigation,
      cancelRender: runtime.cancelRender,
      render: runtime.render,
    },
  });
  const bulk = createBulkImportSection({
    enabled: e.bulkEnabled,
    format: e.qrFormat,
    fields: e.bulkFields,
    expectedFields: e.bulkExpectedFields,
    requiredFields: e.bulkRequiredFields,
    fileInput: e.bulkFileInput,
    rowIndex: e.bulkRowIndex,
    status: e.bulkStatus,
    clearButton: e.bulkClear,
    fileFormatButton: document.querySelector('[data-choice-target="qr-format"][data-choice-value="file"]'),
    onFormatFallback: runtime.syncChoices,
    onChange: runtime.render,
  });

  return {
    file,
    bulk,
    getActiveFile: file.cache.getFile,
    invalidateChunkCapacityCache: file.capacity.invalidate,
    getChunkedFileCapacityInfo: file.capacity.getChunkInfo,
    getSelectedFileEncodingMode: file.section.getMode,
    syncFileModeVisibility: file.section.syncMode,
    syncFileCapacityHint: file.section.syncCapacity,
    clearLoadedFile: file.section.clear,
    getBulkSchema: bulk.getSchema,
    isBulkMode: bulk.isMode,
    getBulkCurrentRow: bulk.getCurrentRow,
    getBulkRowCount: bulk.getRowCount,
    getBulkParseError: bulk.getError,
    syncBulkStatus: bulk.syncStatus,
    syncBulkControls: bulk.syncControls,
    clearBulkData: bulk.clear,
    loadBulkFile: bulk.load,
  };
}
