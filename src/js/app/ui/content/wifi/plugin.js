import { validateWifi } from './validation.js';

export function createWifiPlugin({ document, section }) {
  return {
    build: section.buildPayload,
    preview: section.buildPreview,
    maskPreview: section.maskPayload,
    validate: () => validateWifi(document),
  };
}
