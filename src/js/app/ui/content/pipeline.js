import { createContentPayload } from './payload.js';

export function createContentPipeline({
  document,
  elements: e,
  bulk,
  number,
  file,
  plugins,
  runtime,
  alphanumericCharacters,
}) {
  const buildBulkText = () =>
    bulk.build({
      frameIndex: runtime.getFrameIndex(),
      alphanumericCharacters,
    });
  const frameOptions = {
    format: e.format,
    isBulkMode: bulk.isMode,
    getBulkRow: bulk.getRow,
    getNumberPayload: number.getPayload,
    getActiveFile: file.getActive,
    getFileMode: file.getMode,
    render: runtime.render,
    onDisableArtwork() {
      runtime.syncChoices();
      runtime.syncArtwork();
    },
  };
  let frameController = null;
  let frameRequest = null;
  const ensureFrame = () => {
    if (frameController) return Promise.resolve(frameController);
    if (!frameRequest) {
      frameRequest = import('./frame/document-section.js')
        .then(({ createFrameSectionFromDocument }) => {
          frameController = createFrameSectionFromDocument(
            document,
            frameOptions,
          );
          return frameController;
        })
        .catch((error) => {
          frameRequest = null;
          throw error;
        });
    }
    return frameRequest;
  };
  const frame = {
    getMessage() {
      return frameController?.getMessage() ?? '';
    },
    setCentered(enabled) {
      ensureFrame()
        .then((controller) => controller.setCentered(enabled))
        .catch(console.error);
    },
    getFont: (size) =>
      frameController?.getFont(size) ??
      `800 ${size}px "Avenir Next", "Segoe UI", sans-serif`,
    getRenderOptions: () =>
      frameController?.getRenderOptions() ?? {
        centered: false,
        lineHeight: 18,
        color: '#111827',
      },
    sync: () => frameController?.sync(),
    load: () => ensureFrame(),
  };
  const payload = createContentPayload({
    bulk: { isMode: bulk.isMode, build: buildBulkText },
    plugins,
  });
  return { frame, payload, buildBulkText };
}
