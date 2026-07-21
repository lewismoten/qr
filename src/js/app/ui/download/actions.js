import { getErrorText, lookup } from '../../../i18n/index.js';
import { createAnimationDownloader } from './animation-actions.js';
import { MEDIA_TYPE_JPEG, MEDIA_TYPE_PNG } from '../../media-types.js';

const DEFAULT_EXPORT_QUALITY_PERCENT = 92;
const PERCENT_SCALE = 100;
const OBJECT_URL_REVOCATION_DELAY_MS = 1000;

let exportersPromise;
const loadExporters = () => {
  exportersPromise ??= import('./exporters.js');
  return exportersPromise;
};

export function createDownloadActions(options) {
  const {
    canvas,
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
  } = options;
  const buttons = new Set();
  const connected = new WeakSet();
  const setDisabled = (disabled) =>
    buttons.forEach((button) => {
      button.disabled = disabled;
    });
  const getQuality = () =>
    (Number.parseInt(options.qualityInput?.value, 10) ||
      DEFAULT_EXPORT_QUALITY_PERCENT) / PERCENT_SCALE;
  const makePdf = async (sourceCanvas) => {
    const { createPdfBlob } = await loadExporters();
    return createPdfBlob(
      sourceCanvas,
      getQuality(),
      getPrintWidthInches(sourceCanvas),
    );
  };
  const capturePdf = async (sourceCanvas) => {
    const { capturePdfFrame } = await loadExporters();
    return capturePdfFrame(
      sourceCanvas,
      getQuality(),
      getPrintWidthInches(sourceCanvas),
    );
  };
  const exportCanvas = async (sourceCanvas, format) => {
    const { canvasToBlob, createGifBlob, createSvgBlob } =
      await loadExporters();
    if (format === 'jpg')
      return canvasToBlob(sourceCanvas, MEDIA_TYPE_JPEG, getQuality(), true);
    if (format === 'gif') return createGifBlob(sourceCanvas);
    if (format === 'svg') return createSvgBlob(sourceCanvas);
    if (format === 'pdf') return makePdf(sourceCanvas);
    return canvasToBlob(sourceCanvas, MEDIA_TYPE_PNG);
  };
  const triggerDownload = (blob, name) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    window.setTimeout(
      () => URL.revokeObjectURL(url),
      OBJECT_URL_REVOCATION_DELAY_MS,
    );
  };
  const getSuffix = () => {
    const total = getFrameCount();
    return total > 1
      ? `-${String(getCurrentFrame()).padStart(String(total).length, '0')}`
      : '';
  };
  const restoreFrame = async (frame) => {
    setCurrentFrame(frame);
    syncFrameNavigation();
    await render();
  };

  const downloadCurrent = async () => {
    const format = options.formatInput.value;
    setDisabled(true);
    status.textContent = lookup('download.creating', 'Creating {format}...', {
      format: format.toUpperCase(),
    });
    try {
      triggerDownload(
        await exportCanvas(canvas, format),
        `qr-code${getSuffix()}.${format}`,
      );
      status.textContent = lookup('download.ready', 'Download ready.');
    } catch (error) {
      status.textContent = getErrorText(
        error,
        lookup('download.error', 'Unable to create download.'),
      );
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
      status.textContent = getErrorText(
        error,
        lookup('download.pdfError', 'Unable to create PDF.'),
      );
      console.error(error);
    } finally {
      setDisabled(false);
    }
  };

  const downloadAllZip = async () => {
    const total = getFrameCount();
    if (total <= 1) return;
    const originalFrame = getCurrentFrame();
    const format = options.formatInput.value;
    const width = String(total).length;
    const files = [];
    setDisabled(true);
    try {
      for (let frame = 1; frame <= total; frame += 1) {
        status.textContent = lookup(
          'download.rendering',
          'Rendering {frame} of {total}...',
          { frame, total },
        );
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
      status.textContent = lookup(
        'download.zipReady',
        'ZIP ready with {total} files.',
        { total },
      );
    } catch (error) {
      status.textContent = getErrorText(
        error,
        lookup('download.zipError', 'Unable to create ZIP.'),
      );
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
        status.textContent = lookup(
          'download.renderingPdf',
          'Rendering PDF frame {frame} of {total}...',
          { frame, total },
        );
        setCurrentFrame(frame);
        syncFrameNavigation();
        await render();
        frames.push(await capturePdf(canvas));
      }
      status.textContent = lookup(
        'download.layoutPdf',
        'Laying out PDF pages...',
      );
      const { createPdfSheetBlob, getPdfSheetLayout } = await loadExporters();
      const { framesPerPage } = getPdfSheetLayout(frames);
      triggerDownload(createPdfSheetBlob(frames), `qr-codes-${total}.pdf`);
      const pages = Math.ceil(total / framesPerPage);
      status.textContent = lookup(
        pages === 1
          ? 'download.pdfSheetReadyOne'
          : 'download.pdfSheetReadyMany',
        pages === 1
          ? 'PDF ready with {total} QR codes on {pages} page.'
          : 'PDF ready with {total} QR codes on {pages} pages.',
        { total, pages },
      );
    } catch (error) {
      status.textContent = getErrorText(
        error,
        lookup('download.pdfError', 'Unable to create PDF.'),
      );
      console.error(error);
    } finally {
      await restoreFrame(originalFrame);
      setDisabled(false);
    }
  };

  const downloadAnimation = createAnimationDownloader({
    canvas,
    status,
    getFrameCount,
    getCurrentFrame,
    setCurrentFrame,
    syncFrameNavigation,
    render,
    getAnimationTiming,
    formatAnimationDuration,
    taskProgress,
    setDisabled,
    restoreFrame,
    triggerDownload,
    loadExporters,
  });

  const attach = (button, action) => {
    if (!button || connected.has(button)) return;
    connected.add(button);
    buttons.add(button);
    button.addEventListener('click', action);
  };
  const attachButtons = (next) => {
    attach(next.currentButton, downloadCurrent);
    attach(next.currentPdfButton, downloadCurrentPdf);
    attach(next.zipButton, downloadAllZip);
    attach(next.allPdfButton, downloadAllPdf);
    attach(next.gifButton, () => downloadAnimation('gif'));
    attach(next.mp4Button, () => downloadAnimation('mp4'));
  };
  attachButtons({
    currentButton,
    currentPdfButton,
    zipButton,
    allPdfButton,
    gifButton,
    mp4Button,
  });
  return { attachButtons };
}
