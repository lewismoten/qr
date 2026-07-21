import { createFileCache } from './transfer/cache.js';
import { createFileCapacityCalculator } from './file-capacity.js';
import { createFileManifestController } from './transfer/manifest.js';
import { createFilePayloadBuilder } from './transfer/file-payload.js';
import { createFileSection } from './file-content-section.js';
import { createFileSettings } from './transfer/settings.js';
import { createFilePayloadPreview } from './preview.js';

export function createFileSetup({
  elements: e,
  encoder,
  protocol,
  createId,
  encodeBase64,
  runtime,
}) {
  const compressionEnabled = () =>
    e.includeManifest.checked && e.compressTransfer.checked;
  const cache = createFileCache({
    input: e.input,
    createId,
    encodeBase64,
    isCompressionEnabled: compressionEnabled,
  });
  const manifest = createFileManifestController({
    cache,
    includeManifest: () => e.includeManifest.checked,
    getCustomMetadata: () => e.customMetadata.value,
    isCompressionEnabled: compressionEnabled,
    protocol,
  });
  let section;
  let settings;
  const capacity = createFileCapacityCalculator({
    encoder,
    cache,
    getOptions: () => runtime.buildOptions(),
    buildPayload: (text) => runtime.buildPayload(text),
    getConfiguredVersion: () => settings.getVersion(),
    isAutoVersion: () => e.versionAuto.checked,
    getCurrentChunk: () => Number.parseInt(e.chunkIndex.value, 10) || 1,
    includeManifest: () => e.includeManifest.checked,
    isCompressionEnabled: compressionEnabled,
    getCustomMetadata: () => e.customMetadata.value.trim(),
    getManualMode: () => runtime.getEncodingMode(),
    getManifestLength: manifest.getByteLength,
    getShareableAppUrl: runtime.getShareableAppUrl,
  });
  section = createFileSection({
    format: e.format,
    mode: e.mode,
    input: e.input,
    capacityHint: e.capacityHint,
    clearButton: e.clearButton,
    chunkControls: e.chunkControls,
    chunkVersionAuto: e.chunkVersionAuto,
    includeManifest: e.includeManifest,
    compressTransfer: e.compressTransfer,
    customMetadata: e.customMetadata,
    chunkIndex: e.chunkIndex,
    cache,
    getDataUrlCapacity: capacity.getDataUrlCapacity,
    getDownloadUrlCapacity: capacity.getDownloadUrlCapacity,
    getChunkInfo: capacity.getChunkInfo,
    isCompressionEnabled: compressionEnabled,
    syncChunkVersionControls: () => settings.syncVersion(),
    syncChunkLabel: () => settings.syncChunkLabel(),
    syncNavigation: () => runtime.syncNavigation(),
    resetCache: (options) => settings.resetCache(options),
  });
  settings = createFileSettings({
    elements: {
      chunkVersion: e.chunkVersion,
      chunkVersionAuto: e.chunkVersionAuto,
      versionLabel: e.versionLabel,
      chunkIndex: e.chunkIndex,
      chunkIndexValue: e.chunkIndexValue,
      versionAuto: e.versionAuto,
      qrVersion: e.qrVersion,
      format: e.format,
    },
    cache,
    capacity,
    getMode: section.getMode,
    cancelRender: runtime.cancelRender,
    render: runtime.render,
    syncCapacity: section.syncCapacity,
    defaultVersion: protocol.defaultVersion,
  });
  const payload = createFilePayloadBuilder({
    cache,
    getMode: section.getMode,
    getShareableAppUrl: runtime.getShareableAppUrl,
    includeManifest: () => e.includeManifest.checked,
    chunkIndex: e.chunkIndex,
    getManifest: manifest.getManifest,
    getCapacityInfo: capacity.getChunkInfo,
    syncCapacity: section.syncCapacity,
  });
  const preview = createFilePayloadPreview({
    getFile: cache.getFile,
    getMode: section.getMode,
    getCapacity: capacity.getChunkInfo,
    includeManifest: e.includeManifest,
  });
  return {
    cache,
    capacity,
    section,
    settings,
    payload,
    preview,
    elements: e,
    compressionEnabled,
  };
}
