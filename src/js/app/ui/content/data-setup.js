import { lookup } from '../../../i18n/index.js';
import { createLoadingIndicator } from '../loading-indicator.js';

const EMPTY_CHUNK_INFO = Object.freeze({
  totalChunks: 1,
  currentChunk: 1,
  chunkCapacity: 0,
  streamLength: 0,
  transferByteLength: 0,
  manifestLength: 0,
  configuredChunkVersion: 1,
  autoVersion: true,
  isSingleFrame: true,
});

export function createContentDataSetup({
  document,
  elements: e,
  encoder,
  protocol,
  runtime,
  taskProgress,
}) {
  let file = null;
  let bulk = null;
  let fileRequest = null;
  let bulkRequest = null;
  const loading = createLoadingIndicator({
    region: e.tabPanels[0]?.parentElement,
  });

  const ensureFile = () => {
    if (file) return Promise.resolve(file);
    if (fileRequest) return fileRequest;
    fileRequest = loading
      .track(
        Promise.all([import('./file/setup.js'), import('./file/protocol.js')]),
      )
      .then(
        ([
          { createFileSetup },
          { arrayBufferToBase64, createCompactFileId },
        ]) => {
          file = createFileSetup({
            elements: {
              input: e.fileInput,
              format: e.qrFormat,
              mode: e.fileEncodingMode,
              capacityHint: e.fileCapacityHint,
              clearButton: e.clearFileButton,
              chunkControls: e.fileChunkControls,
              chunkVersionAuto: e.fileChunkVersionAuto,
              chunkVersion: e.fileChunkVersion,
              chunkVersionValue: e.fileChunkVersionValue,
              includeManifest: e.fileIncludeManifest,
              compressTransfer: e.fileCompressTransfer,
              customMetadata: e.fileCustomMetadata,
              chunkIndex: e.fileChunkIndex,
              chunkIndexValue: e.fileChunkIndexValue,
              versionAuto: e.versionAuto,
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
          return file;
        },
      )
      .catch((error) => {
        fileRequest = null;
        throw error;
      });
    return fileRequest;
  };

  const ensureBulk = () => {
    if (bulk) return Promise.resolve(bulk);
    if (bulkRequest) return bulkRequest;
    bulkRequest = loading
      .track(import('./bulk/section.js'))
      .then(({ createBulkImportSection }) => {
        bulk = createBulkImportSection({
          enabled: e.bulkEnabled,
          format: e.qrFormat,
          fields: e.bulkFields,
          expectedFields: e.bulkExpectedFields,
          requiredFields: e.bulkRequiredFields,
          fileInput: e.bulkFileInput,
          rowIndex: e.bulkRowIndex,
          status: e.bulkStatus,
          clearButton: e.bulkClear,
          fileFormatButton: document.querySelector(
            '[data-choice-target="qr-format"][data-choice-value="file"]',
          ),
          taskProgress,
          onFormatFallback: runtime.syncChoices,
          onChange: runtime.render,
        });
        return bulk;
      })
      .catch((error) => {
        bulkRequest = null;
        throw error;
      });
    return bulkRequest;
  };

  const runFile = (
    action,
    { render = false, renderWhenLoaded = false } = {},
  ) => {
    const wasReady = Boolean(file);
    return ensureFile()
      .then((system) => {
        const result = action(system);
        if (render || (renderWhenLoaded && !wasReady)) runtime.render();
        return result;
      })
      .catch(console.error);
  };
  const runBulk = (
    action,
    { render = false, renderWhenLoaded = false } = {},
  ) => {
    const wasReady = Boolean(bulk);
    return ensureBulk()
      .then((system) => {
        const result = action(system);
        if (render || (renderWhenLoaded && !wasReady)) runtime.render();
        return result;
      })
      .catch(console.error);
  };

  const isFileFormat = () => e.qrFormat.value === 'file';
  const isBulkMode = () => e.bulkEnabled.checked && !isFileFormat();
  const getFileMode = () => e.fileEncodingMode.value || 'data';
  const getChunkVersion = () =>
    Number.parseInt(e.fileChunkVersion.value, 10) ||
    protocol.defaultChunkVersion;

  const fileFacade = {
    cache: {
      getFile: () => file?.cache.getFile() ?? e.fileInput.files?.[0] ?? null,
    },
    capacity: {
      invalidate: () => {
        if (file) file.capacity.invalidate();
      },
      getChunkInfo: () => file?.capacity.getChunkInfo() ?? EMPTY_CHUNK_INFO,
    },
    section: {
      getMode: getFileMode,
      syncMode: () => {
        if (isFileFormat()) {
          runFile((system) => system.section.syncMode(), {
            renderWhenLoaded: true,
          });
        }
      },
      syncCapacity: () => {
        if (isFileFormat()) {
          runFile((system) => system.section.syncCapacity(), {
            renderWhenLoaded: true,
          });
        }
      },
      clear: () =>
        runFile((system) => system.section.clear(), { render: true }),
    },
    settings: {
      getVersion: () => file?.settings.getVersion() ?? getChunkVersion(),
      syncVersion: () => {
        if (isFileFormat()) runFile((system) => system.settings.syncVersion());
      },
      syncChunkLabel: () => {
        if (isFileFormat() && getFileMode() === 'chunked') {
          runFile((system) => system.settings.syncChunkLabel());
        }
      },
      resetDerived: () => runFile((system) => system.settings.resetDerived()),
      resetCache: (options) =>
        runFile((system) => system.settings.resetCache(options), {
          render: true,
        }),
      schedule: (options) =>
        runFile((system) => system.settings.schedule(options)),
    },
    payload: {
      build: () => ensureFile().then((system) => system.payload.build()),
    },
  };

  const preloadFile = () => ensureFile().catch(console.error);
  const preloadBulk = () => ensureBulk().catch(console.error);
  e.fileInput.addEventListener('pointerdown', preloadFile, { once: true });
  e.bulkFileInput.addEventListener('pointerdown', preloadBulk, { once: true });
  e.bulkFileInput.addEventListener('change', () => {
    if (bulk) return;
    ensureBulk()
      .then((system) => system.load())
      .catch(console.error);
  });

  return {
    file: fileFacade,
    bulk: { load: ensureBulk },
    getActiveFile: fileFacade.cache.getFile,
    invalidateChunkCapacityCache: fileFacade.capacity.invalidate,
    getChunkedFileCapacityInfo: fileFacade.capacity.getChunkInfo,
    getSelectedFileEncodingMode: getFileMode,
    syncFileModeVisibility: fileFacade.section.syncMode,
    syncFileCapacityHint: fileFacade.section.syncCapacity,
    clearLoadedFile: fileFacade.section.clear,
    getBulkSchema: () => bulk?.getSchema() ?? null,
    isBulkMode,
    getBulkCurrentRow: () => bulk?.getCurrentRow() ?? null,
    getBulkRowCount: () => bulk?.getRowCount() ?? 0,
    getBulkParseError: () => bulk?.getError() ?? '',
    buildBulkPayload: (options) =>
      ensureBulk().then((system) => system.buildPayload(options)),
    getBulkValidationState: (options) =>
      bulk?.getValidationState(options) ?? {
        error: lookup('bulk.loading', 'Bulk Import tools are loading.'),
        warning: '',
      },
    syncBulkStatus: () => {
      if (bulk) bulk.syncStatus();
    },
    syncBulkControls: () => {
      if (isBulkMode()) {
        runBulk((system) => system.syncControls(), { renderWhenLoaded: true });
      } else if (bulk) bulk.syncControls();
    },
    clearBulkData: () => runBulk((system) => system.clear(), { render: true }),
    loadBulkFile: () => runBulk((system) => system.load()),
  };
}
