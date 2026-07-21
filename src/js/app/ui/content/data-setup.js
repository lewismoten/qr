import { lookup } from '../../../i18n/index.js';
import { ensurePanelFragment } from '../fragment-loader.js';
import { createLoadingIndicator } from '../loading-indicator.js';

const EMPTY_CHUNK_INFO = Object.freeze({
  totalChunks: 1,
  currentChunk: 1,
  chunkCapacity: 0,
  streamLength: 0,
  transferSize: 0,
  manifestLength: 0,
  targetVersion: 1,
  autoVersion: true,
  isSingleFrame: true,
});

export function createContentDataSetup(options) {
  const {
    document,
    elements: e,
    protocol,
    runtime,
    taskProgress,
    limits,
  } = options;
  const loading = createLoadingIndicator({
    region: e.tabPanels[0]?.parentElement,
  });
  let file;
  let bulk;
  let fileRequest;
  let bulkRequest;

  const ensureFile = () => {
    if (file) return Promise.resolve(file);
    if (!fileRequest) {
      fileRequest = loading
        .track(import('./file/file-lazy-setup.js'))
        .then(({ createLazyFileSystem }) => createLazyFileSystem(options))
        .then((system) => {
          file = system;
          return system;
        })
        .catch((error) => {
          fileRequest = null;
          throw error;
        });
    }
    return fileRequest;
  };
  const ensureBulk = () => {
    if (bulk) return Promise.resolve(bulk);
    if (!bulkRequest) {
      bulkRequest = loading
        .track(
          ensurePanelFragment(document.getElementById('bulk-fields')).then(
            () => import('./bulk/bulk-lazy-setup.js'),
          ),
        )
        .then(({ createLazyBulkSystem }) =>
          createLazyBulkSystem({
            document,
            enabled: e.bulkEnabled,
            format: e.qrFormat,
            taskProgress,
            runtime,
          }),
        )
        .then((system) => {
          bulk = system;
          return system;
        })
        .catch((error) => {
          bulkRequest = null;
          throw error;
        });
    }
    return bulkRequest;
  };
  const run = (ensure, action, renderWhenLoaded = false) => {
    const wasReady = ensure === ensureFile ? Boolean(file) : Boolean(bulk);
    return ensure()
      .then((system) => {
        const result = action(system);
        if (renderWhenLoaded && !wasReady) runtime.render();
        return result;
      })
      .catch(console.error);
  };
  const isFile = () => e.qrFormat.value === 'file';
  const isBulkMode = () => e.bulkEnabled.checked && !isFile();
  const fileAction = (action, render) => run(ensureFile, action, render);
  const bulkAction = (action, render) => run(ensureBulk, action, render);
  const fileFacade = {
    cache: { getFile: () => file?.getActive() ?? null },
    capacity: {
      invalidate: () => file?.invalidateCapacity(),
      getChunkInfo: () => file?.getCapacity() ?? EMPTY_CHUNK_INFO,
    },
    section: {
      getMode: () => file?.getMode() ?? 'data',
      syncMode: () =>
        isFile() && fileAction((system) => system.syncMode(), true),
      syncCapacity: () =>
        isFile() && fileAction((system) => system.syncCapacity(), true),
      clear: () => fileAction((system) => system.clear()),
      getChunkIndex: () => file?.getIndex() ?? null,
    },
    settings: {
      getVersion: () => file?.getVersion() ?? protocol.defaultVersion,
      syncVersion: () =>
        isFile() && fileAction((system) => system.syncVersion()),
      syncChunkLabel: () => file?.syncChunkLabel(),
      resetDerived: () => file?.resetDerived(),
      resetCache: (value) => fileAction((system) => system.resetCache(value)),
      schedule: (value) => fileAction((system) => system.schedule(value)),
    },
    payload: {
      build: () => ensureFile().then((system) => system.build()),
      preview: () =>
        file?.preview() ??
        lookup('content.preview.file', '[Selected file content]'),
    },
  };

  return {
    file: fileFacade,
    getActiveFile: fileFacade.cache.getFile,
    invalidateChunkCapacityCache: fileFacade.capacity.invalidate,
    getChunkedFileCapacityInfo: fileFacade.capacity.getChunkInfo,
    getSelectedFileEncodingMode: fileFacade.section.getMode,
    syncFileModeVisibility: fileFacade.section.syncMode,
    syncFileCapacityHint: fileFacade.section.syncCapacity,
    clearLoadedFile: fileFacade.section.clear,
    isBulkMode,
    getBulkSchema: () => bulk?.getSchema() ?? null,
    getBulkCurrentRow: () => bulk?.getCurrentRow() ?? null,
    getBulkRowCount: () => bulk?.getRowCount() ?? 0,
    getBulkRowIndex: () => bulk?.getRowIndex() ?? null,
    getBulkParseError: () => bulk?.getError() ?? '',
    buildBulkPayload: (value) =>
      ensureBulk().then((system) => system.buildPayload(value)),
    getBulkValidationState: (value) =>
      bulk?.getValidation({ ...value, limits }) ?? {
        error: lookup('bulk.loading', 'Bulk Import tools are loading.'),
        warning: '',
      },
    syncBulkStatus: () => bulk?.syncStatus(),
    syncBulkControls: () => {
      if (isBulkMode()) {
        bulkAction((system) => system.syncControls(), true);
      } else {
        bulk?.syncControls();
      }
    },
    clearBulkData: () => bulkAction((system) => system.clear(), true),
    loadBulkFile: () => bulkAction((system) => system.load()),
  };
}
