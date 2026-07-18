export function createWifiPlugin(section) {
  return {
    build: section.buildPayload,
    preview: section.buildPreview,
    maskPreview: section.maskPayload,
  };
}
