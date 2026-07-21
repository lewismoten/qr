import { lookup } from '../../../../../i18n/index.js';

export function createFileSettings({
  elements: e,
  cache,
  capacity,
  getMode,
  cancelRender,
  render,
  syncCapacity,
  defaultVersion,
}) {
  let timer = 0;
  let request = 0;
  const getVersion = () => {
    const version = Number.parseInt(e.chunkVersion.value, 10);
    return Number.isFinite(version) ? version : defaultVersion;
  };
  const syncChunkLabel = () => {
    const current = Number.parseInt(e.chunkIndex.value, 10) || 1;
    const total = Number.parseInt(e.chunkIndex.max, 10) || 1;
    e.chunkIndexValue.textContent = lookup(
      'common.count',
      '{current} / {total}',
      {
        current: Math.min(current, total),
        total,
      },
    );
  };
  const syncVersion = () => {
    e.chunkVersionAuto.checked = e.versionAuto.checked;
    e.chunkVersion.value = e.qrVersion.value || String(defaultVersion);
    const chunked = e.format.value === 'file' && getMode() === 'chunked';
    e.chunkVersion.disabled = !chunked || e.chunkVersionAuto.checked;
    e.versionLabel.textContent = `V${getVersion()}`;
  };
  const resetDerived = () => {
    cache.resetDerived();
    capacity.invalidate();
  };
  const resetCache = ({ clearInput = false } = {}) => {
    cache.reset({ clearInput });
    capacity.invalidate();
  };
  const schedule = ({ resetChunkIndex = false, delay = 160 } = {}) => {
    const requestId = ++request;
    cancelRender();
    if (timer) window.clearTimeout(timer);
    if (resetChunkIndex) e.chunkIndex.value = '1';
    capacity.invalidate();
    timer = window.setTimeout(() => {
      if (requestId !== request) return;
      timer = 0;
      syncCapacity();
      render();
    }, delay);
  };
  return {
    getVersion,
    syncChunkLabel,
    syncVersion,
    resetDerived,
    resetCache,
    schedule,
  };
}
