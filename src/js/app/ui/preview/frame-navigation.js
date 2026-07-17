import { lookup } from '../../../i18n/index.js';

export function createFrameNavigation({
  format,
  isBulkMode,
  getBulkRowCount,
  bulkRowIndex,
  syncBulkStatus,
  getFileEncodingMode,
  fileChunkIndex,
  syncFileChunkLabel,
  numberSequenceIndex,
  getNumberSequenceInfo,
  syncNumberSequenceControls,
  maxNumberFrames,
  navigation,
  status,
  previousButton,
  nextButton,
  onStateChange,
}) {
  const getFrameCount = () => {
    if (isBulkMode()) return Math.max(1, getBulkRowCount());
    if (format.value === 'file' && getFileEncodingMode() === 'chunked') {
      return Math.max(1, Number.parseInt(fileChunkIndex.max, 10) || 1);
    }
    if (format.value === 'number') {
      const total = getNumberSequenceInfo().total;
      return total <= maxNumberFrames ? total : 1;
    }
    return 1;
  };

  const getCurrentFrame = () => {
    if (isBulkMode()) return Math.max(1, Number.parseInt(bulkRowIndex.value, 10) || 1);
    const input = format.value === 'number' ? numberSequenceIndex : fileChunkIndex;
    return Math.max(1, Number.parseInt(input.value, 10) || 1);
  };

  const setCurrentFrame = (frame) => {
    if (isBulkMode()) {
      bulkRowIndex.value = String(Math.min(Math.max(1, frame), Math.max(1, getBulkRowCount())));
      syncBulkStatus();
      return;
    }
    if (format.value === 'number') {
      numberSequenceIndex.value = String(frame);
      syncNumberSequenceControls();
      return;
    }
    fileChunkIndex.value = String(frame);
    syncFileChunkLabel();
  };

  const sync = () => {
    const total = getFrameCount();
    const current = Math.min(getCurrentFrame(), total);
    const supportsSequence = isBulkMode()
      || (format.value === 'file' && getFileEncodingMode() === 'chunked')
      || format.value === 'number';
    const show = supportsSequence && total > 1;
    navigation.classList.toggle('has-navigation', show);
    status.hidden = !show;
    status.textContent = lookup('common.sequence', '{current} of {total}', { current, total });
    previousButton.hidden = !show;
    nextButton.hidden = !show;
    previousButton.disabled = !show || current <= 1;
    nextButton.disabled = !show || current >= total;
    onStateChange();
  };

  return { getFrameCount, getCurrentFrame, setCurrentFrame, sync };
}
