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
    status.textContent = `Creating ${format.toUpperCase()}...`;
    try {
      triggerDownload(await exportCanvas(canvas, format), `qr-code${getSuffix()}.${format}`);
      status.textContent = 'Download ready.';
    } catch (error) {
      status.textContent = error.message || 'Unable to create download.';
      console.error(error);
    } finally {
      setDisabled(false);
    }
  };

  const downloadCurrentPdf = async () => {
    setDisabled(true);
    status.textContent = 'Creating PDF...';
    try {
      triggerDownload(await makePdf(canvas), `qr-code${getSuffix()}.pdf`);
      status.textContent = 'PDF ready.';
    } catch (error) {
      status.textContent = error.message || 'Unable to create PDF.';
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
        status.textContent = `Rendering ${frame} of ${total}...`;
        setCurrentFrame(frame);
        syncFrameNavigation();
        await render();
        files.push({
          name: `qr-code-${String(frame).padStart(width, '0')}.${format}`,
          blob: await exportCanvas(canvas, format),
        });
      }
      status.textContent = 'Building ZIP...';
      const { createZipBlob } = await loadExporters();
      triggerDownload(await createZipBlob(files), `qr-codes-${total}.zip`);
      status.textContent = `ZIP ready with ${total} files.`;
    } catch (error) {
      status.textContent = error.message || 'Unable to create ZIP.';
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
        status.textContent = `Rendering PDF frame ${frame} of ${total}...`;
        setCurrentFrame(frame);
        syncFrameNavigation();
        await render();
        frames.push(await capturePdf(canvas));
      }
      status.textContent = 'Laying out PDF pages...';
      const { createPdfSheetBlob, getPdfSheetLayout } = await loadExporters();
      const { framesPerPage } = getPdfSheetLayout(frames);
      triggerDownload(createPdfSheetBlob(frames), `qr-codes-${total}.pdf`);
      const pages = Math.ceil(total / framesPerPage);
      status.textContent = `PDF ready with ${total} QR codes on ${pages} ${pages === 1 ? 'page' : 'pages'}.`;
    } catch (error) {
      status.textContent = error.message || 'Unable to create PDF.';
      console.error(error);
    } finally {
      await restoreFrame(originalFrame);
      setDisabled(false);
    }
  };

  const captureAnimationFrames = async (total) => {
    const { cloneCanvas } = await loadExporters();
    const originalFrame = getCurrentFrame();
    const frames = [];
    try {
      for (let frame = 1; frame <= total; frame += 1) {
        status.textContent = `Capturing animation frame ${frame} of ${total}...`;
        setCurrentFrame(frame);
        syncFrameNavigation();
        await render();
        frames.push(cloneCanvas(canvas));
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
      status.textContent = `Animation is limited to ${MAX_ANIMATION_FRAMES} images to protect browser memory.`;
      return;
    }
    const { enteredDurationMs, perFrameMs, totalDurationMs } = getAnimationTiming(total);
    if (enteredDurationMs <= 0 || perFrameMs < 10) {
      status.textContent = 'Choose a duration that provides at least 10 milliseconds per image.';
      return;
    }
    if (format === 'gif' && perFrameMs > 655350) {
      status.textContent = 'GIF supports at most 10 minutes 55.35 seconds per image.';
      return;
    }
    if (format === 'mp4' && perFrameMs < 16) {
      status.textContent = 'MP4 needs at least 16 milliseconds per image.';
      return;
    }
    setDisabled(true);
    try {
      const frames = await captureAnimationFrames(total);
      if (format === 'gif') {
        const { createAnimatedGifBlob } = await loadExporters();
        status.textContent = 'Encoding animated GIF...';
        triggerDownload(createAnimatedGifBlob(frames, perFrameMs), `qr-animation-${total}.gif`);
        status.textContent = `Animated GIF ready - ${formatAnimationDuration(totalDurationMs)} total.`;
      } else {
        const { createAnimatedMp4Blob } = await loadExporters();
        status.textContent = `Recording MP4 in real time - ${formatAnimationDuration(totalDurationMs)}...`;
        const blob = await createAnimatedMp4Blob(frames, perFrameMs, (frame, count) => {
          status.textContent = `Recording MP4 frame ${frame} of ${count}...`;
        });
        triggerDownload(blob, `qr-animation-${total}.mp4`);
        status.textContent = 'MP4 ready.';
      }
    } catch (error) {
      status.textContent = error.message || `Unable to create ${format.toUpperCase()} animation.`;
      console.error(error);
    } finally {
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
