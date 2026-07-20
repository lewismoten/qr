import { lookup } from '../../../../i18n/index.js';
import { setupFilePicker } from '../../file-picker.js';

const EMPTY_CHUNK_INFO = Object.freeze({
  totalChunks: 1,
  currentChunk: 1,
  chunkCapacity: 0,
  streamLength: 0,
  transferByteLength: 0,
  manifestLength: 0,
  configuredChunkVersion: 1,
  autoVersion: true,
  isSingleFrame: true,
});

function bindFileEvents(file, e, runtime, protocol) {
  e.input.addEventListener('change', () => {
    file.settings.resetCache();
    e.chunkIndex.value = '1';
    file.section.syncCapacity();
    runtime.render();
  });
  e.clearButton.addEventListener('click', () => {
    file.section.clear();
    runtime.render();
  });
  for (const input of [
    e.includeManifest,
    e.compressTransfer,
    e.customMetadata,
  ]) {
    input.addEventListener('input', () => {
      file.settings.resetDerived();
      file.settings.schedule({ resetChunkIndex: true });
    });
  }
  e.chunkIndex.addEventListener('input', () => {
    file.capacity.invalidate();
    file.section.syncCapacity();
    runtime.render();
  });
  e.chunkVersionAuto.addEventListener('change', () => {
    e.versionAuto.checked = e.chunkVersionAuto.checked;
    if (e.chunkVersionAuto.checked) {
      e.qrVersion.value = String(protocol.defaultChunkVersion);
    }
    runtime.formatVersion();
    file.settings.syncVersion();
    file.settings.schedule({ resetChunkIndex: true, delay: 0 });
  });
  e.chunkVersion.addEventListener('input', () => {
    e.qrVersion.value = e.chunkVersion.value;
    runtime.formatVersion();
    file.settings.syncVersion();
    file.settings.schedule({ resetChunkIndex: true });
  });
  document
    .querySelectorAll('[data-choice-target="file-encoding-mode"]')
    .forEach((button) => {
      button.addEventListener('click', () => {
        if (button.dataset.choiceValue === 'chunked' && e.versionAuto.checked) {
          e.qrVersion.value = String(protocol.defaultChunkVersion);
        }
        file.settings.syncVersion();
        runtime.formatVersion();
        file.settings.schedule({ resetChunkIndex: true, delay: 0 });
      });
    });
}

export async function createLazyFileSystem({
  document,
  elements,
  encoder,
  protocol,
  runtime,
}) {
  const [setupModule, protocolModule, elementsModule] = await Promise.all([
    import('./file-setup.js'),
    import('./transfer/protocol.js'),
    import('./file-elements.js'),
  ]);
  const fileElements = elementsModule.getFileElements(document, elements);
  setupFilePicker(fileElements.input);
  const file = setupModule.createFileSetup({
    elements: fileElements,
    encoder,
    protocol,
    createId: protocolModule.createCompactFileId,
    encodeBase64: protocolModule.arrayBufferToBase64,
    runtime: {
      buildOptions: runtime.buildOptions,
      buildPayload: runtime.buildPayload,
      getEncodingMode: runtime.getEncodingMode,
      getShareableAppUrl: runtime.getShareableAppUrl,
      syncNavigation: runtime.syncNavigation,
      cancelRender: runtime.cancelRender,
      render: runtime.render,
    },
  });
  bindFileEvents(file, fileElements, runtime, protocol);
  const isActive = () => elements.qrFormat.value === 'file';
  const run = (action, render = false) => {
    const result = action();
    if (render) runtime.render();
    return result;
  };
  return {
    getActive: () => file.cache.getFile(),
    invalidateCapacity: () => file.capacity.invalidate(),
    getCapacity: () => file.capacity.getChunkInfo() ?? EMPTY_CHUNK_INFO,
    getMode: () => file.section.getMode(),
    getIndex: () => file.elements.chunkIndex,
    syncMode: () => isActive() && file.section.syncMode(),
    syncCapacity: () => isActive() && file.section.syncCapacity(),
    clear: () => run(() => file.section.clear(), true),
    getVersion: () => file.settings.getVersion(),
    syncVersion: () => isActive() && file.settings.syncVersion(),
    syncChunkLabel: () => {
      if (isActive() && file.section.getMode() === 'chunked') {
        file.settings.syncChunkLabel();
      }
    },
    resetDerived: () => file.settings.resetDerived(),
    resetCache: (options) => run(() => file.settings.resetCache(options), true),
    schedule: (options) => file.settings.schedule(options),
    build: () => file.payload.build(),
    preview: () =>
      file.preview() ??
      lookup('content.preview.file', '[Selected file content]'),
  };
}
