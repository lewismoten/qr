import { getErrorText, lookup } from '../../../i18n/index.js';
import { isAbortError, throwIfAborted } from '../../abort.js';

const MAX_ANIMATION_FRAMES = 200;
let exportersPromise;
const loadExporters = () => {
  exportersPromise ??= import('./exporters.js');
  return exportersPromise;
};

export function createDownloadActions({
  canvas,
  formatInput,
  qualityInput,
  status,
  currentButton,
  currentPdfButton,
  zipButton,
  allPdfButton,
  gifButton,
  mp4Button,
  getPrintWidthInches,
  getFrameCount,
  getCurrentFrame,
  setCurrentFrame,
  syncFrameNavigation,
  render,
  getAnimationTiming,
  formatAnimationDuration,
  taskProgress,
}) {
  const buttons = [currentButton, currentPdfButton, zipButton, allPdfButton, gifButton, mp4Button];
  const setDisabled = (disabled) => buttons.forEach((button) => { button.disabled = disabled; });
  const getQuality = () => (Number.parseInt(qualityInput.value, 10) || 92) / 100;
  const makePdf = async (sourceCanvas) => {
    const { createPdfBlob } = await loadExporters();
    return createPdfBlob(sourceCanvas, getQuality(), getPrintWidthInches(sourceCanvas));
  };
  const capturePdf = async (sourceCanvas) => {
    const { capturePdfFrame } = await loadExporters();
    return capturePdfFrame(sourceCanvas, getQuality(), getPrintWidthInches(sourceCanvas));
  };
  const exportCanvas = async (sourceCanvas, format) => {
    const { canvasToBlob, createGifBlob, createSvgBlob } = await loadExporters();
    if (format === 'jpg') return canvasToBlob(sourceCanvas, 'image/jpeg', getQuality(), true);
    if (format === 'gif') return createGifBlob(sourceCanvas);
    if (format === 'svg') return createSvgBlob(sourceCanvas);
    if (format === 'pdf') return makePdf(sourceCanvas);
    return canvasToBlob(sourceCanvas, 'image/png');
  };
  const triggerDownload = (blob, name) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const getSuffix = () => {
    const total = getFrameCount();
    return total > 1 ? `-${String(getCurrentFrame()).padStart(String(total).length, '0')}` : '';
  };
  const restoreFrame = async (frame) => {
    setCurrentFrame(frame);
    syncFrameNavigation();
    await render();
  };

  const downloadCurrent = async () => {
    const format = formatInput.value;
    setDisabled(true);
    status.textContent = lookup('download.creating', 'Creating {format}...', { format: format.toUpperCase() });
    try {
      triggerDownload(await exportCanvas(canvas, format), `qr-code${getSuffix()}.${format}`);
      status.textContent = lookup('download.ready', 'Download ready.');
    } catch (error) {
      status.textContent = getErrorText(error, lookup('download.error', 'Unable to create download.'));
      console.error(error);
    } finally {
      setDisabled(false);
    }
  };

  const downloadCurrentPdf = async () => {
    setDisabled(true);
    status.textContent = lookup('download.creatingPdf', 'Creating PDF...');
    try {
      triggerDownload(await makePdf(canvas), `qr-code${getSuffix()}.pdf`);
      status.textContent = lookup('download.pdfReady', 'PDF ready.');
    } catch (error) {
      status.textContent = getErrorText(error, lookup('download.pdfError', 'Unable to create PDF.'));
      console.error(error);
    } finally {
      setDisabled(false);
    }
  };

  const downloadAllZip = async () => {
    const total = getFrameCount();
    if (total <= 1) return;
    const originalFrame = getCurrentFrame();
    const format = formatInput.value;
    const width = String(total).length;
    const files = [];
    setDisabled(true);
    try {
      for (let frame = 1; frame <= total; frame += 1) {
        status.textContent = lookup('download.rendering', 'Rendering {frame} of {total}...', { frame, total });
        setCurrentFrame(frame);
        syncFrameNavigation();
        await render();
        files.push({
          name: `qr-code-${String(frame).padStart(width, '0')}.${format}`,
          blob: await exportCanvas(canvas, format),
        });
      }
      status.textContent = lookup('download.buildingZip', 'Building ZIP...');
      const { createZipBlob } = await loadExporters();
      triggerDownload(await createZipBlob(files), `qr-codes-${total}.zip`);
      status.textContent = lookup('download.zipReady', 'ZIP ready with {total} files.', { total });
    } catch (error) {
      status.textContent = getErrorText(error, lookup('download.zipError', 'Unable to create ZIP.'));
      console.error(error);
    } finally {
      await restoreFrame(originalFrame);
      setDisabled(false);
    }
  };

  const downloadAllPdf = async () => {
    const total = getFrameCount();
    if (total <= 1) return;
    const originalFrame = getCurrentFrame();
    const frames = [];
    setDisabled(true);
    try {
      for (let frame = 1; frame <= total; frame += 1) {
        status.textContent = lookup('download.renderingPdf', 'Rendering PDF frame {frame} of {total}...', { frame, total });
        setCurrentFrame(frame);
        syncFrameNavigation();
        await render();
        frames.push(await capturePdf(canvas));
      }
      status.textContent = lookup('download.layoutPdf', 'Laying out PDF pages...');
      const { createPdfSheetBlob, getPdfSheetLayout } = await loadExporters();
      const { framesPerPage } = getPdfSheetLayout(frames);
      triggerDownload(createPdfSheetBlob(frames), `qr-codes-${total}.pdf`);
      const pages = Math.ceil(total / framesPerPage);
      status.textContent = lookup(
        pages === 1 ? 'download.pdfSheetReadyOne' : 'download.pdfSheetReadyMany',
        pages === 1 ? 'PDF ready with {total} QR codes on {pages} page.' : 'PDF ready with {total} QR codes on {pages} pages.',
        { total, pages },
      );
    } catch (error) {
      status.textContent = getErrorText(error, lookup('download.pdfError', 'Unable to create PDF.'));
      console.error(error);
    } finally {
      await restoreFrame(originalFrame);
      setDisabled(false);
    }
  };

  const captureAnimationFrames = async (total, task, captureWeight) => {
    const { cloneCanvas } = await loadExporters();
    const originalFrame = getCurrentFrame();
    const frames = [];
    try {
      for (let frame = 1; frame <= total; frame += 1) {
        throwIfAborted(task.signal);
        const message = lookup('download.capturingFrame', 'Capturing animation frame {frame} of {total}...', { frame, total });
        status.textContent = message;
        task.update(((frame - 1) / total) * captureWeight, message);
        setCurrentFrame(frame);
        syncFrameNavigation();
        await render();
        frames.push(cloneCanvas(canvas));
        task.update((frame / total) * captureWeight, message);
        await new Promise((resolve) => window.setTimeout(resolve, 0));
      }
      return frames;
    } finally {
      await restoreFrame(originalFrame);
    }
  };

  const downloadAnimation = async (format) => {
    const total = getFrameCount();
    if (total <= 1) return;
    if (total > MAX_ANIMATION_FRAMES) {
      status.textContent = lookup('download.animationLimit', 'Animation is limited to {max} images to protect browser memory.', { max: MAX_ANIMATION_FRAMES });
      return;
    }
    const { enteredDurationMs, perFrameMs, totalDurationMs } = getAnimationTiming(total);
    if (enteredDurationMs <= 0 || perFrameMs < 10) {
      status.textContent = lookup('download.durationMinimum', 'Choose a duration that provides at least 10 milliseconds per image.');
      return;
    }
    if (format === 'gif' && perFrameMs > 655350) {
      status.textContent = lookup('download.gifDurationMaximum', 'GIF supports at most 10 minutes 55.35 seconds per image.');
      return;
    }
    if (format === 'mp4' && perFrameMs < 16) {
      status.textContent = lookup('download.mp4DurationMinimum', 'MP4 needs at least 16 milliseconds per image.');
      return;
    }
    setDisabled(true);
    const captureWeight = format === 'gif' ? 0.45 : 0.25;
    const title = lookup(
      format === 'gif' ? 'download.progress.titleGif' : 'download.progress.titleMp4',
      format === 'gif' ? 'Creating animated GIF' : 'Creating MP4 animation',
    );
    const task = taskProgress.start({
      title,
      phase: lookup('download.progress.preparing', 'Preparing animation...'),
    });
    let completed = false;
    try {
      const frames = await captureAnimationFrames(total, task, captureWeight);
      throwIfAborted(task.signal);
      if (format === 'gif') {
        const { createAnimatedGifBlob } = await loadExporters();
        const message = lookup('download.encodingGif', 'Encoding animated GIF...');
        status.textContent = message;
        task.update(captureWeight, message);
        const blob = await createAnimatedGifBlob(frames, perFrameMs, {
          signal: task.signal,
          onProgress: (frame, count) => task.update(
            captureWeight + (frame / count) * (1 - captureWeight),
            lookup('download.progress.encodingFrame', 'Encoding GIF frame {frame} of {total}...', { frame, total: count }),
          ),
        });
        throwIfAborted(task.signal);
        triggerDownload(blob, `qr-animation-${total}.gif`);
        status.textContent = lookup('download.gifReady', 'Animated GIF ready - {duration} total.', { duration: formatAnimationDuration(totalDurationMs) });
      } else {
        const { createAnimatedMp4Blob } = await loadExporters();
        const message = lookup('download.recordingMp4', 'Recording MP4 in real time - {duration}...', { duration: formatAnimationDuration(totalDurationMs) });
        status.textContent = message;
        task.update(captureWeight, message);
        const blob = await createAnimatedMp4Blob(frames, perFrameMs, {
          signal: task.signal,
          onProgress: (frame, count) => {
            const frameMessage = lookup('download.recordingFrame', 'Recording MP4 frame {frame} of {total}...', { frame, total: count });
            status.textContent = frameMessage;
            task.update(captureWeight + (frame / count) * (1 - captureWeight), frameMessage);
          },
        });
        throwIfAborted(task.signal);
        triggerDownload(blob, `qr-animation-${total}.mp4`);
        status.textContent = lookup('download.mp4Ready', 'MP4 ready.');
      }
      completed = true;
    } catch (error) {
      if (isAbortError(error)) status.textContent = lookup('download.progress.canceled', 'Animation export canceled.');
      else {
        status.textContent = getErrorText(
          error,
          lookup('download.animationError', 'Unable to create {format} animation.', { format: format.toUpperCase() }),
        );
        console.error(error);
      }
    } finally {
      task.finish({ completed });
      setDisabled(false);
    }
  };

  currentButton.addEventListener('click', downloadCurrent);
  currentPdfButton.addEventListener('click', downloadCurrentPdf);
  zipButton.addEventListener('click', downloadAllZip);
  allPdfButton.addEventListener('click', downloadAllPdf);
  gifButton.addEventListener('click', () => downloadAnimation('gif'));
  mp4Button.addEventListener('click', () => downloadAnimation('mp4'));
}
