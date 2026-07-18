import { createFrameNavigation } from '../preview/frame-navigation.js';
import { loadFeatureStylesheet } from '../../../stylesheets.js';

export function createLazyDownloadSetup({
  document,
  elements: e,
  bulk,
  file,
  number,
  runtime,
  taskProgress,
  maxNumberFrames,
  getPrintWidth,
  syncPrint,
}) {
  let controller = null;
  let request = null;
  const frames = createFrameNavigation({
    format: e.qrFormat,
    isBulkMode: bulk.isMode,
    getBulkRowCount: bulk.getRowCount,
    bulkRowIndex: e.bulkRowIndex,
    syncBulkStatus: bulk.syncStatus,
    getFileEncodingMode: file.getMode,
    fileChunkIndex: e.fileChunkIndex,
    syncFileChunkLabel: file.syncChunkLabel,
    numberSequenceIndex: document.getElementById('number-sequence-index'),
    getNumberSequenceInfo: number.getInfo,
    syncNumberSequenceControls: number.sync,
    maxNumberFrames,
    navigation: e.chunkPreviewNav,
    status: e.chunkPreviewStatus,
    previousButton: e.chunkPreviewPrev,
    nextButton: e.chunkPreviewNext,
    onStateChange: () => controller?.syncControls(),
  });

  const ensure = () => {
    if (controller) return Promise.resolve(controller);
    if (!request) {
      request = Promise.all([
        loadFeatureStylesheet('download'),
        import('../download/application-setup.js'),
      ])
        .then(([, { createApplicationDownloadSetup }]) => {
          controller = createApplicationDownloadSetup({
            elements: e,
            frames,
            runtime,
            getPrintWidth,
            syncPrint,
            taskProgress,
          });
          return controller;
        })
        .catch((error) => {
          request = null;
          throw error;
        });
    }
    return request;
  };

  return {
    load: (name) => ensure().then((system) => system.load(name)),
    syncControls: () => controller?.syncControls(),
    syncAnimation: () => controller?.syncAnimation(),
    getFrameCount: frames.getFrameCount,
    getCurrentFrame: frames.getCurrentFrame,
    setCurrentFrame: frames.setCurrentFrame,
    syncNavigation: frames.sync,
  };
}
