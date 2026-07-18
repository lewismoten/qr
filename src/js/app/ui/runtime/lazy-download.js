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
  connectPrintElements,
}) {
  let controller = null;
  let request = null;
  const frames = createFrameNavigation({
    format: e.qrFormat,
    isBulkMode: bulk.isMode,
    getBulkRowCount: bulk.getRowCount,
    getBulkRowIndex: bulk.getRowIndex,
    syncBulkStatus: bulk.syncStatus,
    getFileEncodingMode: file.getMode,
    getFileChunkIndex: file.getIndex,
    syncFileChunkLabel: file.syncChunkLabel,
    getNumberSequenceIndex: number.getIndex,
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
        import('../download/elements.js'),
      ])
        .then(
          ([, { createApplicationDownloadSetup }, { getDownloadElements }]) => {
            const downloadElements = getDownloadElements(document, e);
            connectPrintElements(downloadElements);
            controller = createApplicationDownloadSetup({
              elements: downloadElements,
              frames,
              runtime,
              getPrintWidth,
              syncPrint,
              taskProgress,
            });
            return controller;
          },
        )
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
