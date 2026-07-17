import { createDownloadControls } from './controls.js';
import { createDownloadSetup } from './setup.js';

export function createApplicationDownloadSetup({ elements: e, bulk, file, number, runtime,
  maxNumberFrames, getPrintWidth }) {
  let setup;
  const syncControls = createDownloadControls({
    elements: {
      format: e.downloadFormat, qualityControls: e.downloadQualityControls,
      quality: e.downloadQuality, qualityValue: e.downloadQualityValue,
      zip: e.downloadZip, allPdf: e.downloadAllPdf,
      animationTab: e.downloadAnimationTab, subtabBar: e.downloadSubtabBar,
      actionGroups: e.downloadActions,
    },
    getFrameCount: () => setup.frames.getFrameCount(),
    activateImageTab: runtime.activateImageTab,
    syncAnimation: () => setup.animation.sync(),
  });
  setup = createDownloadSetup({
    elements: {
      format: e.qrFormat, bulkRowIndex: e.bulkRowIndex, fileChunkIndex: e.fileChunkIndex,
      numberSequenceIndex: e.numberSequenceIndex, navigation: e.chunkPreviewNav,
      navigationStatus: e.chunkPreviewStatus, previous: e.chunkPreviewPrev,
      next: e.chunkPreviewNext, animationTimingMode: e.animationTimingMode,
      animationMinutes: e.animationMinutes, animationSeconds: e.animationSeconds,
      animationMilliseconds: e.animationMilliseconds,
      animationSummary: e.animationDurationSummary, animationMp4: e.downloadAnimationMp4,
      canvas: e.canvas, downloadFormat: e.downloadFormat, downloadQuality: e.downloadQuality,
      downloadStatus: e.downloadStatus, downloadCurrent: e.downloadCurrent,
      downloadCurrentPdf: e.downloadCurrentPdf, downloadZip: e.downloadZip,
      downloadAllPdf: e.downloadAllPdf, downloadGif: e.downloadAnimatedGif,
    },
    bulk,
    file,
    number,
    runtime: { syncControls, render: runtime.render },
    maxNumberFrames,
    getPrintWidth,
  });

  return {
    setup,
    syncControls,
    getFrameCount: setup.frames.getFrameCount,
    getCurrentFrame: setup.frames.getCurrentFrame,
    setCurrentFrame: setup.frames.setCurrentFrame,
    syncNavigation: setup.frames.sync,
    syncAnimation: setup.animation.sync,
  };
}
