import { createContentPipeline } from './pipeline.js';
import { createQrConfiguration } from '../encoding/encoding-configuration.js';

export function createContentEncodingSetup({
  document,
  e,
  encoder,
  bulk,
  file,
  sections,
  runtime,
  helpers,
  config,
}) {
  const pipeline = createContentPipeline({
    document,
    elements: {
      format: e.qrFormat,
    },
    bulk: { isMode: bulk.isMode, getRow: bulk.getRow, build: bulk.build },
    number: { getPayload: sections.number.getPayload },
    file: {
      getActive: file.getActive,
      getMode: file.getMode,
    },
    plugins: sections.plugins,
    runtime: {
      getFrameIndex: runtime.getFrameIndex,
      render: runtime.render,
      syncChoices: runtime.syncChoices,
      syncArtwork: runtime.syncArtwork,
    },
    alphaChars: config.alphaChars,
  });
  const qr = createQrConfiguration({
    elements: {
      qrMargin: e.qrMargin,
      qrScale: e.qrScale,
      qrWidthAuto: e.qrWidthAuto,
      qrWidth: e.qrWidth,
      qrFormat: e.qrFormat,
      versionAuto: e.versionAuto,
      qrVersion: e.qrVersion,
      maskPattern: e.maskPattern,
      modeAuto: e.modeAuto,
    },
    encoder,
    helpers: {
      getErrorLevel: helpers.getErrorLevel,
      readInteger: helpers.readInteger,
      withAlpha: helpers.withAlpha,
      getQrColors: helpers.getQrColors,
      getFileMode: file.getMode,
      getChunkVersion: file.getChunkVersion,
      getEncodingMode: helpers.getEncodingMode,
    },
    alphaChars: config.alphaChars,
  });
  const emailCapacity = {
    getInfo: () =>
      sections.plugins.get('email')?.getCapacity?.() ?? { current: 0, max: 0 },
    sync() {
      if (e.qrFormat.value !== 'email') return;
      sections
        .ensureFormat('email')
        .then((plugin) => plugin?.syncCapacity?.())
        .catch(console.error);
    },
  };
  const validation = async () => {
    if (bulk.isMode()) {
      return bulk.getValidation({
        rowNumber: runtime.getFrameIndex() + 1,
      });
    }
    const plugin = await sections.ensureFormat(e.qrFormat.value);
    return plugin?.validate?.() ?? { error: '', warning: '' };
  };
  const updatePreview = (text) => {
    const debugState = runtime.getDebugState();
    if (debugState.tab !== 'debug' || debugState.subtab !== 'payload') return;
    const preview = text || pipeline.payload.preview();
    const plugin = sections.plugins.get();
    e.encodedPreview.textContent = plugin?.maskPreview?.(preview) ?? preview;
  };
  return { pipeline, qr, emailCapacity, validation, updatePreview };
}
