import { getSupportedMp4MimeType } from '../../mp4.js';
import { createDownloadActions } from './actions.js';
import { createAnimationSection } from './animation/section.js';
import { createFrameNavigation } from './frames.js';

export function createDownloadSetup({ elements: e, bulk, file, number, runtime, maxNumberFrames, getPrintWidth }) {
  const frames = createFrameNavigation({
    format: e.format, isBulkMode: bulk.isMode, getBulkRowCount: bulk.getRowCount,
    bulkRowIndex: e.bulkRowIndex, syncBulkStatus: bulk.syncStatus,
    getFileEncodingMode: file.getMode, fileChunkIndex: e.fileChunkIndex,
    syncFileChunkLabel: file.syncChunkLabel, numberSequenceIndex: e.numberSequenceIndex,
    getNumberSequenceInfo: number.getInfo, syncNumberSequenceControls: number.sync,
    maxNumberFrames, navigation: e.navigation, status: e.navigationStatus,
    previousButton: e.previous, nextButton: e.next,
    onDownloadStateChange: () => runtime.syncControls(),
  });
  const animation = createAnimationSection({
    timingMode: e.animationTimingMode, minutesInput: e.animationMinutes,
    secondsInput: e.animationSeconds, millisecondsInput: e.animationMilliseconds,
    summary: e.animationSummary, mp4Button: e.animationMp4,
    getFrameCount: frames.getFrameCount, getSupportedMp4MimeType,
  });
  createDownloadActions({
    canvas: e.canvas, formatInput: e.downloadFormat, qualityInput: e.downloadQuality,
    status: e.downloadStatus, currentButton: e.downloadCurrent,
    currentPdfButton: e.downloadCurrentPdf, zipButton: e.downloadZip,
    allPdfButton: e.downloadAllPdf, gifButton: e.downloadGif, mp4Button: e.animationMp4,
    getPrintWidthInches: getPrintWidth, getFrameCount: frames.getFrameCount,
    getCurrentFrame: frames.getCurrentFrame, setCurrentFrame: frames.setCurrentFrame,
    syncFrameNavigation: frames.sync, render: () => runtime.render(),
    getAnimationTiming: animation.getTiming, formatAnimationDuration: animation.formatDuration,
  });
  return { frames, animation };
}
